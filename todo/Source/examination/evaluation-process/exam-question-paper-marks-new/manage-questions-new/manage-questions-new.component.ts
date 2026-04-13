import { Component, ElementRef, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { Location } from '@angular/common';
import { NgxSpinnerService } from 'ngx-spinner';
import { CONSTANTS } from 'app/main/common/constants';
import * as FileSaver from 'file-saver';
import { fuseAnimations } from '@fuse/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatRipple } from '@angular/material/core';
import { EditQuestionsComponent } from '../../exam-question-paper-marks/edit-questions/edit-questions.component';
import { ParametersService } from 'app/main/services/parameters.service';

@Component({
    selector: 'app-manage-questions-new',
    templateUrl: './manage-questions-new.component.html',
    styleUrls: ['./manage-questions-new.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: fuseAnimations
})
export class ManageQuestionsNewComponent implements OnInit {

    displayedColumns: string[] = ['id', 'subQuestion', 'question', 'totalMarks', 'Actions'];
    dataSource: MatTableDataSource<any>;

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    @ViewChild(MatRipple) ripple: MatRipple;


    firstFormGroup: FormGroup;
    enquiryFormErrors: any;
    assessment = [];
    public formData;
    questionJson: any = {};
    questions = [];
    marks: [];
    examQuestionpapersmarks: any[] = [];
    temlateListDetails = [];
    qpList = [];
    finalformatedList: any[] = [];
    orderedQuestions = [];

    private examQpTemplateUrl = CONSTANTS.ExamQpTemplateUrl;
    private addExamQpQuestionsListUrl = CONSTANTS.addExamQpQuestionsListUrl;
    private assessmentCrudUrl = CONSTANTS.assessmentCrudUrl;
    private addQuestionUrl = CONSTANTS.addQuestionUrl;
    private importAssessmentUrl = CONSTANTS.importAssessmentUrl;
    private examQpQuestionsCrudUrl = CONSTANTS.examQpQuestionsCrudUrl;

    totalMarks = 0;
    params: any = {};

    @ViewChild('excelAvatar') excelAvatar: ElementRef;

    QuestionPaperMarks: any;

    constructor(private router: Router, private formBuilder: FormBuilder, private crudService: CrudService, private dialog: MatDialog,
        private snotifyService: SnotifyService, private _location: Location, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions, private parameters: ParametersService) { }

    ngOnInit(): void {
        this.firstFormGroup = this.formBuilder.group({
            hour: ['00'],
            minute: ['00'],
            noOfMaxAttempts: [0],
            totalQuestions: [0],
            minMarksToPass: [0],
            minMarksPercentage: [0],
        });
        if (this.parameters.manageQuestions) {
            this.params = this.parameters.manageQuestions[0];
        }
        else {
            this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks']);
        }

        // this.route.queryParams
        // .subscribe(params => {
        //      this.params = params;

        //     if (!this.isEmptyObject(params)) {
        //         this.params.CourseCode=params.CourseCode,
        //         this.params.ExamMonthYear = params.ExamMonthYear;
        //         this.params.CourseYear = params.CourseYear;
        //         this.params.subjectcode = params.subjectcode;
        //         this.params.RegulationCode = params.RegulationCode;
        //         this.params.ExamDate = params.ExamDate;
        //         this.params.CourseGroupCode = params.CourseGroupCode;
        //         this.params.questionPaperId = params.questionPaperId;
        //         this.params.subjectName = params.subjectName;
        //     }
        // });
        this.getTemplateDetails();
    }

    isEmptyObject(obj) {
        return (obj && (Object.keys(obj).length === 0));
    }
    applyFilter(filterValue: string) {
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    getTemplateDetails(): void {
        this.temlateListDetails = []
        this.spinner.show();

        this.crudService.listDetailsByTwoIds(this.examQpTemplateUrl, this.params.templateId, 'true', 'examQpTemplateId', 'isActive')
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.data && result.data !== '') {
                        if (result.data.resultList.length > 0) {
                            this.temlateListDetails = result.data.resultList[0].examQpTemplateDetailsDTO;
                            this.totalMarks = result.data.resultList[0].totalmarks
                            this.getQuestionList();
                        }
                        // Assign the data to the data source for the API
                    } else {
                        this.snotifyService.success(result.message, 'Success!');
                    }
                } else {
                    this.snotifyService.error(result.message, 'Error!');
                }
            }, error => {
                this.spinner.hide();
                if (error.error.statusCode === 401) {
                    this.snotifyService.error(error.error.message, 'Error!');
                    this.genericFunctions.logOut(this.router.url);
                } else {
                    this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                }
            });
    }

    getQuestionList() {
        this.orderedQuestions = [];
        this.crudService.listDetailsByTwoIds(this.examQpQuestionsCrudUrl, this.params.questionPaperId, 'true', 'ExamQp.examQpId', 'isActive')
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.data && result.data !== '') {
                        this.qpList = result.data.resultList;
                        if (this.qpList.filter(x => (x.questionNumber === null)).length > 0){
                           this.updateQuestionOrder();
                        }
                        const structured = this.clubTemplateWithQuestions(this.temlateListDetails, this.qpList);
                        this.finalformatedList = structured;
                        console.log(structured);
                        // Assign the data to the data source for the API
                    } else {
                        this.snotifyService.success(result.message, 'Success!');
                    }
                } else {
                    this.snotifyService.error(result.message, 'Error!');
                }
            }, error => {
                this.spinner.hide();
                if (error.error.statusCode === 401) {
                    this.snotifyService.error(error.error.message, 'Error!');
                    this.genericFunctions.logOut(this.router.url);
                } else {
                    this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                }
            });
    }

    updateQuestionOrder(){
         this.qpList.sort((a, b) => {
                if (a.parentBlockId !== b.parentBlockId) {
                    return a.parentBlockId - b.parentBlockId;
                }
                if (a.levelNo !== b.levelNo) {
                    return a.levelNo - b.levelNo;
                }
                return a.levelOrderNo - b.levelOrderNo;
            });
        
        let i = 1;
        this.qpList.map((x) => {
            if (x.isActive){
                x.questionNumber = i++;
            }
        })
        this.crudService.add(this.addExamQpQuestionsListUrl, this.qpList)
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.success) {
                        this.snotifyService.success(result.message, 'Success!');
                       this.getQuestionList();
                    }
                } else {
                    this.snotifyService.error(result.message, 'Error!');
                }
            }, error => {
                this.spinner.hide();
                if (error.error.statusCode === 401) {
                    this.snotifyService.error(error.error.message, 'Error!');
                    this.genericFunctions.logOut(this.router.url);
                } else {
                    this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                }
            });
    }

    clubTemplateWithQuestions(template: any[], questions: any[]): any[] {
        template.map(y => {
            if (questions.filter(x => (x.parentBlockId === y.blockId)).length > 0) {
                y.questions = questions.filter(x => (x.parentBlockId === y.blockId));
            }
        })
        return template;
    }

    getData(): void {
        this.crudService.listDetailsById(this.assessmentCrudUrl, this.params.assessmentId, 'assessmentId')
            .subscribe(result => {
                if (result.statusCode === 200) {
                    if (result.success) {
                        this.assessment = result.data.resultList;
                    } else {
                        this.snotifyService.success(result.message, 'Success!');
                    }
                } else {
                    this.snotifyService.error(result.message, 'Error!');
                }
            }, error => {
                if (error.error.statusCode === 401) {
                    this.snotifyService.error(error.error.message, 'Error!');
                    this.genericFunctions.logOut(this.router.url);
                } else {
                    this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                }
            });
    }

    addQuestion(e: any): void {
        this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/add-manual-questions'],
            {
                queryParams: {
                    questionPaperId: this.params.questionPaperId,
                    examName: this.params.exam_name,
                    questionpaper_title: this.params.questionpaper_title,
                    CourseCode: this.params.CourseCode,
                    ExamMonthYear: this.params.ExamMonthYear,
                    academicYearId: this.params.academicYearId,
                    CourseYear: this.params.CourseYear,
                    subjectcode: this.params.subjectcode,
                    RegulationCode: this.params.RegulationCode,
                    ExamDate: this.params.ExamDate,
                    CourseGroupCode: this.params.CourseGroupCode,
                    subjectName: this.params.subjectName,
                    level0no: e.level0no,
                    level1no: e.level1no,
                    groupno: e.groupno,
                    subgroupno: e.subgroupno,
                    questionnumber: e.questionnumber,
                    questioncode: e.questioncode,
                    subquestioncode: e.subquestioncode,
                    iqm: e.individual_question_marks
                }
            }

        );
    }
    questionBank(e: any): void {
        console.log(e)
        this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks-new/question-bank-new']);
        let queryParams = [{
            examName: this.params.exam_name,
            questionPaperId: this.params.questionPaperId,
            questionpaper_title: this.params.questionpaper_title,
            courseId: this.params.courseId,
            academicYearId: this.params.academicYearId,
            subjectId: this.params.subjectId,
            examId: this.params.examId,
            regulationId: this.params.regulationId,
            subjectCode: this.params.subjectCode,
            levelno: e.levelno,
            levelOrderNo: e.levelOrderNo,
            // parentBlockId: e.parentBlockId,
            parentBlockId: e.blockId,
            groupno: e.groupno,
            subgroupno: e.subgroupno,
            questionnumber: e.questionnumber,
            questioncode: e.questioncode,
            subquestioncode: e.subquestioncode,
            iqm: e.individual_question_marks,
            examQPId: 1,
            templateId: this.params.templateId
        }]
        this.parameters.questionBank = queryParams;
    }

    editQuestion(data): void {
        console.log(data);
        this.crudService.listDetailsById(this.examQpQuestionsCrudUrl, data.qpQuestionsId, 'qpQuestionsId')
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.QuestionPaperMarks = result.data.resultList[0];
                        const dialogRef = this.dialog.open(EditQuestionsComponent, {
                            width: '750px',
                            data: this.QuestionPaperMarks
                        });
                        dialogRef.afterClosed().subscribe(details => {
                            if (details != null && details !== '') {
                                this.QuestionPaperMarks.question = details.question;
                                this.QuestionPaperMarks.isActive = details.isActive;
                                this.QuestionPaperMarks.questionMarks = details.questionMarks;
                                if (details.question == '') {
                                    this.QuestionPaperMarks.question = null;
                                    this.QuestionPaperMarks.isActive = details.isActive;
                                }
                                this.updateQuestion(this.QuestionPaperMarks);
                            }
                        });
                    }
                }
            });

    }

    updateQuestion(details): void {
        this.spinner.show();
         this.qpList.sort((a, b) => {
                if (a.parentBlockId !== b.parentBlockId) {
                    return a.parentBlockId - b.parentBlockId;
                }
                if (a.levelNo !== b.levelNo) {
                    return a.levelNo - b.levelNo;
                }
                return a.levelOrderNo - b.levelOrderNo;
            });
        if (this.qpList.filter(x => (x.qpQuestionsId === details.qpQuestionsId)).length > 0) {
           this.qpList.filter(x => (x.qpQuestionsId === details.qpQuestionsId))[0].question = details.question;
           this.qpList.filter(x => (x.qpQuestionsId === details.qpQuestionsId))[0].isActive = details.isActive;
            this.qpList.filter(x => (x.qpQuestionsId === details.qpQuestionsId))[0].questionMarks = details.questionMarks;
        }
        
        let i = 1;
        this.qpList.map((x) => {
            if (x.isActive){
                x.questionNumber = i++;
            }
        })
        this.crudService.add(this.addExamQpQuestionsListUrl, this.qpList)
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.success) {
                        this.snotifyService.success(result.message, 'Success!');
                       this.getQuestionList();
                    }
                } else {
                    this.snotifyService.error(result.message, 'Error!');
                }
            }, error => {
                this.spinner.hide();
                if (error.error.statusCode === 401) {
                    this.snotifyService.error(error.error.message, 'Error!');
                    this.genericFunctions.logOut(this.router.url);
                } else {
                    this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                }
            });
        //   this.crudService.updateDetails(this.examQpQuestionsCrudUrl, details, details.qpQuestionsId, 'qpQuestionsId')
        //   .subscribe(result => {
        //     this.spinner.hide();
        //     if (result.statusCode === 200) {
        //       if (result.data && result.data !== '') {
        //           this.snotifyService.success(result.message, 'Success!');
        //           this.getQuestionList();
        //       }
        //   } else {
        //       this.spinner.hide();
        //       this.snotifyService.error(result.message, 'Error!');
        //       this.genericFunctions.logOut(this.router.url);
        //   }
        //   }); 
    }

    upload(e): void {
        if (this.excelAvatar.nativeElement.files.length > 0) {
            this.formData = new FormData();
            this.formData.append('file',
                this.excelAvatar.nativeElement.files[0],
                this.excelAvatar.nativeElement.files[0].name);
            this.spinner.show();
            /*-------- FILE UPLOAD ---------*/
            this.crudService.upload(this.importAssessmentUrl, this.formData)
                .subscribe(result1 => {
                    this.spinner.hide();
                    if (result1.statusCode === 200) {
                        if (result1.success) {
                            this.questions = result1.data;
                            this.importedQuestions(result1.data);
                            this.snotifyService.success(result1.message, 'Success!');
                            // this.getData();
                        }
                    } else {
                        this.snotifyService.error(result1.message, 'Error!');
                    }
                }, error => {
                    this.spinner.hide();
                    if (error.error.statusCode === 401) {
                        this.snotifyService.error(error.error.message, 'Error!');
                        this.genericFunctions.logOut(this.router.url);
                    } else {
                        this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                    }
                });
        } else {
            this.snotifyService.info('Please choose a file.', 'Info!');
        }
    }

    importedQuestions(questionList): void {
        for (let i = 0; i < questionList.length; i++) {
            this.questionJson = {};
            this.questionJson.assessmentId = this.params.assessmentId;
            this.questionJson.question = questionList[i].question;
            this.questionJson.fbInputTypeCatId = questionList[i].fbInputTypeCatId;
            this.questionJson.isActive = true;
            this.questionJson.correctAnswerIds = [];
            for (let j = 0; j < questionList[i].courseQuestionOptionDTOs.length; j++) {
                questionList[i].courseQuestionOptionDTOs[j].courseQuestionOptionId = null;
                questionList[i].courseQuestionOptionDTOs[j].courseQuestionId = null;
                questionList[i].courseQuestionOptionDTOs[j].isActive = true;
            }
            this.questionJson.courseQuestionOptionDTOs = questionList[i].courseQuestionOptionDTOs;
            this.questionJson.onlineCourseId = null;
            this.questionJson.courseLessonId = null;
            this.questionJson.courseLessonTopicId = null;

            this.crudService.add(this.addQuestionUrl, this.questionJson)
                .subscribe(result => {
                    this.spinner.hide();
                    if (result.statusCode === 200) {
                        if (result.success) {
                            this.questions = [];
                            this.snotifyService.success(result.message, 'Success!');
                            this.getData();
                            // this.router.navigate([this.params.page],{ queryParams: { assessmentId: this.params.assessmentId } });
                        }
                    } else {
                        this.snotifyService.error(result.message, 'Error!');
                    }
                }, error => {
                    this.spinner.hide();
                    if (error.error.statusCode === 401) {
                        this.snotifyService.error(error.error.message, 'Error!');
                        this.genericFunctions.logOut(this.router.url);
                    } else {
                        this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                    }
                });
        }
    }
    questionList(item): void {
        this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/view-template']);
        let queryParams = [{
            examName: this.params.examName,
            questionPaperId: this.params.questionPaperId,
            questionpaper_title: this.params.questionpaper_title,
            courseId: this.params.courseId,
            academicYearId: this.params.academicYearId,
            subjectId: this.params.subjectId,
            examId: this.params.examId,
            regulationId: this.params.regulationId,
            subjectName: this.params.subjectName,
            subjectCode: this.params.subjectCode,
            pkEQPTid: item[0].pk_exam_questionpaper_template_id
        }]
        this.parameters.viewTemplate = queryParams;
    }

    printQA(item): void {
        this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/print-qa']);
        let queryParams = [{
            examName: this.params.examName,
            questionPaperId: this.params.questionPaperId,
            questionpaper_title: this.params.questionpaper_title,
            courseId: this.params.courseId,
            academicYearId: this.params.academicYearId,
            subjectId: this.params.subjectId,
            examId: this.params.examId,
            regulationId: this.params.regulationId,
            subjectName: this.params.subjectName,
            subjectCode: this.params.subjectCode,
            pkEQPTid: item[0].pk_exam_questionpaper_template_id
        }]
        this.parameters.printqa = queryParams;
    }

    questionAnswerList(item): void {

        this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks-new/print-question-modalanswers'],
            {
                queryParams: {
                    questionPaper: JSON.stringify(item),
                    examName: this.params.examName,
                    questionPaperId: this.params.questionPaperId,
                    questionpaper_title: this.params.questionpaper_title,
                    courseId: this.params.courseId,
                    academicYearId: this.params.academicYearId,
                    subjectId: this.params.subjectId,
                    examId: this.params.examId,
                    regulationId: this.params.regulationId,
                    subjectName: this.params.subjectName,
                    subjectCode: this.params.subjectCode

                },
            }


        );
    }

    goBack(): void {
        this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks-new']);
        let queryParams = [{
            examName: this.params.examName,
            questionPaperId: this.params.questionPaperId,
            courseId: this.params.courseId,
            academicYearId: this.params.academicYearId,
            subjectId: this.params.subjectId,
            examId: this.params.examId,
            regulationId: this.params.regulationId,
            subjectName: this.params.subjectName,
            subjectCode: this.params.subjectCode
        }]
        this.parameters.questionPaper = queryParams;
    }
    download(): void {
        FileSaver.saveAs('assets/docs/QuestionSheet_bulk_upload.xlsx');
    }

}
