
(function () {
    'use strict';
    window.loaded = false;

    class Answer {
        constructor(answer, type) {
            this.body = answer;
            this.type = type;
        }

        get isMultiChoice() {
            return this.type == "multiple_choice";
        }

        get isFreeResponse() {
            return this.type == "free_response";
        }

        get isExpression() {
            return this.type == "expression";
        }

        get isDropdown() {
            return this.type == "dropdown";
        }

        log() {
            const answer = this.body;
            const style = "color: coral; -webkit-text-stroke: .5px black; font-size:24px; font-weight:bold;";

            answer.map(ans => {
                if (typeof ans == "string") {
                    if (ans.includes("web+graphie")) {
                        this.body[this.body.indexOf(ans)] = "";
                        this.printImage(ans);
                    } else {
                        answer[answer.indexOf(ans)] = ans.replaceAll("$", "");
                    }
                }
            });

            const text = answer.join("\n");
            if (text) {
                console.log(`%c${text.trim()} `, style);
            }
        }

        printImage(ans) {
            const url = ans.replace("![](web+graphie", "https").replace(")", ".svg");
            const image = new Image();

            image.src = url;
            image.onload = () => {
                const imageStyle = [
                    'font-size: 1px;',
                    'line-height: ', this.height % 2, 'px;',
                    'padding: ', this.height * .5, 'px ', this.width * .5, 'px;',
                    'background-size: ', this.width, 'px ', this.height, 'px;',
                    'background: url(', url, ');'
                ].join(' ');
                console.log('%c ', imageStyle);
            };
        }
    }

    const originalFetch = window.fetch;
    window.fetch = function () {
        return originalFetch.apply(this, arguments).then(async (res) => {
            if (res.url.includes("/getAssessmentItem")) {
                const clone = res.clone();
                const json = await clone.json()

                let item, question;

                try {
                    item = json.data.assessmentItem.item.itemData;
                    question = JSON.parse(item).question;
                } catch {
                    let errorIteration = () => { return localStorage.getItem("error_iter") || 0; }
                    localStorage.setItem("error_iter", errorIteration() + 1);

                    if (errorIteration() < 4) {
                        return location.reload();
                    } else {
                        return console.log("%c An error occurred", "color: red; font-weight: bolder; font-size: 20px;");
                    }
                }

                if (!question) return;

                Object.keys(question.widgets).map(widgetName => {
                    switch (widgetName.split(" ")[0]) {
                        case "numeric-input":
                            return freeResponseAnswerFrom(question).log();
                        case "radio":
                            return multipleChoiceAnswerFrom(question).log();
                        case "expression":
                            return expressionAnswerFrom(question).log();
                        case "dropdown":
                            return dropdownAnswerFrom(question).log();
                    }
                });
            }

            if (!window.loaded) {
                console.clear();
                window.loaded = true;
            }

            return res;
        })
    }

    function freeResponseAnswerFrom(question) {
        const answer = Object.values(question.widgets).map((widget) => {
            if (widget.options?.answers) {
                return widget.options.answers.map(answer => {
                    if (answer.status == "correct") {
                        return answer.value;
                    }
                });
            }
        }).flat().filter((val) => { return val !== undefined; });

        return new Answer(answer, "free_response");
    }

    function multipleChoiceAnswerFrom(question) {
        const answer = Object.values(question.widgets).map((widget) => {
            if (widget.options?.choices) {
                return widget.options.choices.map(choice => {
                    if (choice.correct) {
                        return choice.content;
                    }
                });
            }
        }).flat().filter((val) => { return val !== undefined; });

        return new Answer(answer, "multiple_choice");
    }

    function expressionAnswerFrom(question) {
        const answer = Object.values(question.widgets).map((widget) => {
            if (widget.options?.answerForms) {
                return widget.options.answerForms.map(answer => {
                    if (Object.values(answer).includes("correct")) {
                        return answer.value;
                    }
                });
            }
        }).flat();

        return new Answer(answer, "expression");
    }

    function dropdownAnswerFrom(question) {
        const answer = Object.values(question.widgets).map((widget) => {
            if (widget.options?.choices) {
                return widget.options.choices.map(choice => {
                    if (choice.correct) {
                        return choice.content;
                    }
                });
            }
        }).flat();

        return new Answer(answer, "dropdown");
    }
})();

function openPopup(assignment) {
    var media = assignment.medias[0];
    var teacher_assignment = assignment.teacherAssignments[0];
    var assigned_date = new Date(teacher_assignment.preferences.startDate);
    var date = new Date(media.createdAt);
    thumbnail = media.thumbnailURL;
    if (thumbnail.startsWith("/")) {
        thumbnail = "https://" + window.location.hostname + thumbnail;
    }

    var deadline_text;
    if (teacher_assignment.preferences.dueDate == "") {
        deadline_text = "no due date"
    }
    else {
        deadline_text = "due on " + (new Date(teacher_assignment.preferences.dueDate)).toDateString();
    }

    var base_html = `
  <!DOCTYPE html>
  <head>
    <style>
      * {font-family: Arial}
    </style>
    <script>
      var base_url = "${base_url}";
      function http_get(url, callback) {
        var request = new XMLHttpRequest();
        request.addEventListener("load", callback);
        request.open("GET", url, true);
        request.send();
      }
      function get_tag(tag, url) {
        console.log("Loading "+url);
        http_get(url, function(){
          if ((""+this.status)[0] == "2") {
            var element = document.createElement(tag);
            element.innerHTML = this.responseText;
            document.getElementsByTagName("head")[0].appendChild(element);
          }
          else {
            console.error("Could not fetch "+url);
          }
        });
      }
      get_tag("style", base_url+"/app/popup.css");
      get_tag("script", base_url+"/app/popup.js");
      get_tag("script", base_url+"/app/videooptions.js");
      get_tag("script", base_url+"/app/videospeed.js");
    </script>
    <title>Answers for: ${media.title}</title>
  </head>
  <div id="header_div">
    <div>
      <img src="${thumbnail}" height="108px">
    </div>
    <div id="title_div">
      <p style="font-size: 16px"><b>${media.title}</b></h2>
      <p style="font-size: 12px">Uploaded by ${media.user.name} on ${date.toDateString()}</p>
      <p style="font-size: 12px">Assigned on ${assigned_date.toDateString()}, ${deadline_text}</p>
      </div>
    </div>
  </div>
  <hr>
  <div id="content"> 
    <p style="font-size: 12px" id="loading_text"></p>
  </div>
  <hr>
  `;
    popup = window.open("about:blank", "", "width=600, height=400");
    popup.document.write(base_html);

    popup.document.assignment = assignment;
    popup.document.dev_env = document.dev_env;
    popup.document.edpuzzle_data = window.__EDPUZZLE_DATA__;

    getMedia(assignment);
}
