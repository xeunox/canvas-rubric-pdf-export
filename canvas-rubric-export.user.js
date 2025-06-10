// ==UserScript==
// @name         Canvas Rubric PDF Export (v3.7.5 - Inline Layout, Blue No Comment, Page-Safe)
// @namespace    https://github.com/xeunox/canvas-rubric-pdf-export
// @version      3.7.5
// @description  Export Canvas rubrics to PDF with inline rating layout, aligned feedback, blue 'No Comment', and improved page formatting.
// @match        https://*.instructure.com/courses/*/gradebook/speed_grader*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function getStudentDetails() {
        const nameEl = document.querySelector('.ui-selectmenu-item-header');
        const dropdown = document.querySelector('#student_select_box');
        const name = nameEl?.textContent.trim() || 'Unknown Student';

        let studentNumber = 'Unknown';
        const fullText = dropdown?.options[dropdown.selectedIndex]?.textContent.trim() || '';
        const match = fullText.match(/\b(\d{6,})\b/);
        if (match) studentNumber = match[1];

        return { name, number: studentNumber };
    }

    function getAssignmentTitle() {
        const colHeader = document.querySelector('th.css-md78hg-colHeader[colspan="3"]');
        return colHeader?.textContent.trim() || 'Unknown Assignment';
    }

    function getGeneralThreadFeedback() {
        const spanComments = Array.from(document.querySelectorAll('span.comment p'));
        if (spanComments.length > 0) {
            return spanComments[spanComments.length - 1].textContent.trim();
        }
        return '';
    }

    function getStyledRubricHTML() {
        const rubricElem = document.querySelector('.rubric_container');
        if (!rubricElem) return '<p>No rubric found.</p>';

        const clone = rubricElem.cloneNode(true);
        clone.querySelectorAll('input, button, select, textarea').forEach(el => el.remove());

        const originalCriteria = document.querySelectorAll('[data-testid="rubric-criterion"]');
        const clonedCriteria = clone.querySelectorAll('[data-testid="rubric-criterion"]');

        originalCriteria.forEach((origCriterion, i) => {
            const selected = origCriterion.querySelector('.rating-tier.selected.assessing');
            const commentBox = origCriterion.querySelector('textarea[data-selenium="criterion_comments_text"]');
            const clonedTarget = clonedCriteria[i];

            if (!clonedTarget || !selected) return;

            // Flatten all rating descriptions to inline format
            const tierCells = clonedTarget.querySelectorAll('.rating-tier');
            tierCells.forEach(tier => {
                const pts = tier.querySelector('.rating-points')?.innerText.trim();
                const desc = tier.querySelector('.rating-description')?.innerText.trim();
                if (pts && desc) {
                    tier.innerText = `${pts} – ${desc}`;
                    tier.style.display = 'block';
                    tier.style.padding = '4px 0';
                }
            });

            const points = selected.querySelector('.rating-points')?.innerText.trim() || '';
            const desc = selected.querySelector('.rating-description')?.innerText.trim() || '';
            const commentText = commentBox?.value.trim() || '';

            const awardedLabel = document.createElement('div');
            awardedLabel.style.fontWeight = 'bold';
            awardedLabel.style.marginTop = '6px';
            awardedLabel.style.color = '#b30000';
            awardedLabel.innerText = `✔ Awarded: ${points} – ${desc}`;

            const feedbackBox = document.createElement('div');
            feedbackBox.style.marginTop = '4px';
            feedbackBox.style.padding = '6px';
            feedbackBox.style.background = '#f0f0f0';
            feedbackBox.style.border = '1px solid #ccc';
            feedbackBox.innerHTML = commentText
                ? `<strong>Criterion Feedback:</strong> ${commentText}`
                : `<strong>Criterion Feedback:</strong> <span style="color:#0073e6;">No Comment</span>`;
            awardedLabel.appendChild(feedbackBox);

            const selectedClone = clonedTarget.querySelector('.rating-tier.selected.assessing');
            if (selectedClone) {
                selectedClone.style.border = '1pt solid black';
                selectedClone.style.backgroundColor = '#ffe6e6';
                selectedClone.style.padding = '6px';
                selectedClone.style.textAlign = 'left';
                selectedClone.style.verticalAlign = 'top';
                selectedClone.appendChild(awardedLabel);
            }
        });

        clone.querySelectorAll('th, td').forEach(el => {
            el.style.border = '1pt solid black';
            el.style.textAlign = 'left';
            el.style.verticalAlign = 'top';
            el.style.padding = '6px';
        });

        return clone.innerHTML;
    }

    function exportRubricToPDF(studentName, studentNumber, assignmentTitle, rubricHTML, threadReply) {
        const timestamp = new Date().toLocaleString();
        const fullHTML = `
            <html>
                <head>
                    <title>${assignmentTitle} - ${studentName}</title>
                    <style>
                        body {
                            font-family: sans-serif;
                            padding: 20px;
                        }

                        h2, h3 {
                            margin-bottom: 10px;
                        }

                        .thread-reply-box {
                            margin-top: 30px;
                            padding: 10px;
                            background-color: #f5f5f5;
                            border: 1px solid #ccc;
                        }

                        table {
                            border-collapse: collapse;
                            width: 100%;
                            page-break-inside: auto;
                        }

                        th, td {
                            border: 1pt solid black;
                            text-align: left;
                            vertical-align: top;
                            padding: 6px;
                            page-break-inside: avoid;
                            break-inside: avoid;
                        }

                        tr {
                            page-break-inside: avoid;
                            break-inside: avoid;
                        }

                        .rating-tier {
                            page-break-inside: avoid;
                            break-inside: avoid;
                        }

                        div {
                            break-inside: avoid;
                        }
                    </style>
                </head>
                <body>
                    <h2>Rubric Evaluation</h2>
                    <h3>Student: ${studentName} (${studentNumber})</h3>
                    <h3>Assignment: ${assignmentTitle}</h3>
                    <h3>Date: ${timestamp}</h3>
                    ${rubricHTML}
                    ${threadReply ? `<div class="thread-reply-box"><h3>General assignment or task feedback from lecturer or marker</h3><p>${threadReply}</p></div>` : ''}
                </body>
            </html>
        `;

        const win = window.open('', '_blank');
        win.document.open();
        win.document.write(fullHTML);
        win.document.close();

        setTimeout(() => {
            win.print();
        }, 600);
    }

    function addExportButtonBelowRubric() {
        if (document.getElementById('export-rubric-btn-bottom')) return;

        const rubricContainer = document.querySelector('.rubric_container');
        if (!rubricContainer) return;

        const btn = document.createElement('button');
        btn.innerText = 'Download Rubric as PDF';
        btn.id = 'export-rubric-btn-bottom';
        btn.style.marginTop = '12px';
        btn.style.padding = '6px 12px';
        btn.style.backgroundColor = '#0073e6';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';

        btn.onclick = () => {
            const { name: studentName, number: studentNumber } = getStudentDetails();
            const assignmentTitle = getAssignmentTitle();
            const rubricHTML = getStyledRubricHTML();
            const threadReply = getGeneralThreadFeedback();
            exportRubricToPDF(studentName, studentNumber, assignmentTitle, rubricHTML, threadReply);
        };

        rubricContainer.appendChild(btn);
    }

    const observer = new MutationObserver(() => {
        addExportButtonBelowRubric();
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();
