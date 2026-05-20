import { Component, ElementRef, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import {Location} from '@angular/common';
import { NgxSpinnerService } from 'ngx-spinner';
import { CONSTANTS } from 'app/main/common/constants';
import * as FileSaver from 'file-saver';
import { fuseAnimations } from '@fuse/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatRipple } from '@angular/material/core';
import { EditQuestionsComponent } from '../edit-questions/edit-questions.component';
import { ParametersService } from 'app/main/services/parameters.service';

@Component({
  selector: 'app-manage-questions-paper',
  templateUrl: './manage-questions-paper.component.html',
  styleUrls: ['./manage-questions-paper.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations   : fuseAnimations
})

export class ManageQuestionsPaperComponent implements OnInit {
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
  marks : [];
  examQuestionpapersmarks :any[] = [];
  

  private ExamQuestionPaperMarksCrudUrl = CONSTANTS.ExamQuestionPaperMarksCrudUrl;
  private assessmentCrudUrl = CONSTANTS.assessmentCrudUrl;
  private addQuestionUrl = CONSTANTS.addQuestionUrl;
  private importAssessmentUrl = CONSTANTS.importAssessmentUrl;
  private examQuestionPaperDetailsUrl = CONSTANTS.examQuestionPaperDetailsUrl;

  params: any = {};
  @ViewChild('excelAvatar') excelAvatar: ElementRef;
  examQuestionpapermarks: any[];
    examQuestionpapersmarks1=[];

    QuestionPaperMarks: any;
  constructor(private route: ActivatedRoute, private router: Router, private formBuilder: FormBuilder, private crudService: CrudService, private dialog: MatDialog,
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
  
    
    else{
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
    this.getExamQuestionpapermarks();
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

  getExamQuestionpapermarks(): void{
    this.examQuestionpapersmarks1=[]
    this.examQuestionpapersmarks =[]
    /*----------- ExamQuestionpapers -----------*/
    this.crudService.listBySixteenIds(this.examQuestionPaperDetailsUrl,
        'list_exam_questionpaper_details' ,
        1, 
        '1990-01-01', 
        '1990-01-01', 
      this.params.templateId, 
      this.params.questionPaperId,
      0, 
      0, 
      0, 
      0, 
      '1990-01-01', 
      0,
     0,
     0,
     0,
     0,
      'in_flag', 'in_orgid' ,'in_fdate', 'in_tdate','in_exam_questionpaper_template_id','in_exam_questionpaper_id', 'in_exam_id', 'in_course_year_id','in_subject_id', 'in_evalutor_profileid','in_exam_date','in_regulation_id','in_emp_id','in_questionpaper_id','in_evaluator_role_id','in_exam_evaluationassignment_id'
       )
    .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
                if (result.data.result && result.data.result !== '') {
                    this.examQuestionpapersmarks = result.data.result[0];
                    for(let i=0;i<this.examQuestionpapersmarks.length;i++){                           
                            this.examQuestionpapersmarks1[i] = this.examQuestionpapersmarks[i];
                    }
                    // this.examQuestionpapersmarks1 = this.examQuestionpapersmarks1.filter(x => (x.questioncode != null));
                            this.dataSource = new MatTableDataSource(this.examQuestionpapersmarks1);
                            this.dataSource.paginator = this.paginator;
                            this.dataSource.sort = this.sort;
                            
                } else {
                    this.snotifyService.success(result.message, 'Success!');
                }
           }else {
                this.snotifyService.error(result.message, 'Error!');
         }
        }, error => {
            this.spinner.hide();
            if (error.error.statusCode === 401){
                this.snotifyService.error(error.error.message, 'Error!');
                this.genericFunctions.logOut(this.router.url);
            }else{
                this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
            }
        });
    }

  getData(): void{
    this.crudService.listDetailsById(this.assessmentCrudUrl, this.params.assessmentId , 'assessmentId')
    .subscribe(result => {
        if (result.statusCode === 200){
                  if (result.success) {
                      this.assessment = result.data.resultList;
                  } else {
                      this.snotifyService.success(result.message, 'Success!');
                  }
              }else {
                  this.snotifyService.error(result.message, 'Error!');
              }
      }, error => {
          if (error.error.statusCode === 401){
              this.snotifyService.error(error.error.message, 'Error!');
              this.genericFunctions.logOut(this.router.url);
          }else{
              this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          }
      });
  }

  addQuestion(e: any): void{
    this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/add-manual-questions'],
    { queryParams: { questionPaperId: this.params.questionPaperId,
        examName:this.params.exam_name,
        questionpaper_title: this.params.questionpaper_title,
        CourseCode: this.params.CourseCode,
        ExamMonthYear: this.params.ExamMonthYear,
        academicYearId:this.params.academicYearId,
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
     } }

        );
}
questionBank(e: any): void{
  this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/question-bank']);
let queryParams = [{
    examName:this.params.exam_name,
    questionPaperId: this.params.questionPaperId,
    questionpaper_title: this.params.questionpaper_title,
    courseId: this.params.courseId,
    academicYearId:this.params.academicYearId,
    subjectId: this.params.subjectId,
    examId: this.params.examId,
    regulationId: this.params.regulationId,
    subjectCode : this.params.subjectCode,
    level0no: e.level0no,
    level1no: e.level1no,
    groupno: e.groupno,
    subgroupno: e.subgroupno,
    questionnumber: e.questionnumber,
    questioncode: e.questioncode,
    subquestioncode: e.subquestioncode,
    iqm: e.individual_question_marks,
    templateId: this.params.templateId
}]
this.parameters.questionBank = queryParams;
}

editQuestion(data): void {
    this.crudService.listDetailsById(this.ExamQuestionPaperMarksCrudUrl, data.pk_questionpaper_marks_id, 'questionPaperMarksId')
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
                if (details != null && details !== ''){
                    this.QuestionPaperMarks.question = details.question;
                    this.QuestionPaperMarks.isActive = details.isActive;
                    if(details.question == ''){
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
updateQuestion(details):void{
    this.crudService.updateDetails(this.ExamQuestionPaperMarksCrudUrl, details, details.questionPaperMarksId, 'questionPaperMarksId')
    .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200) {
        if (result.data && result.data !== '') {
            this.snotifyService.success(result.message, 'Success!');
            this.getExamQuestionpapermarks();
        }
    } else {
        this.snotifyService.error(result.message, 'Error!');
        this.genericFunctions.logOut(this.router.url);
    }
    }); 
}

upload(e):void{
    if (this.excelAvatar.nativeElement.files.length > 0){
      this.formData = new FormData();
      this.formData.append('file',
      this.excelAvatar.nativeElement.files[0],
      this.excelAvatar.nativeElement.files[0].name);
      this.spinner.show();
      /*-------- FILE UPLOAD ---------*/ 
      this.crudService.upload(this.importAssessmentUrl, this.formData)
      .subscribe(result1 => {
          this.spinner.hide();
          if (result1.statusCode === 200){
              if (result1.success) {
                  this.questions = result1.data;
                  this.importedQuestions(result1.data);
                  this.snotifyService.success(result1.message, 'Success!');
                 // this.getData();
              }
          }else {
              this.snotifyService.error(result1.message, 'Error!');
          }
      }, error => {
          this.spinner.hide();
          if (error.error.statusCode === 401){
              this.snotifyService.error(error.error.message, 'Error!');
              this.genericFunctions.logOut(this.router.url);
          }else{
              this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          }
      });
    }else{
      this.snotifyService.info('Please choose a file.', 'Info!');
    }
}

importedQuestions(questionList): void{
    for (let i = 0; i < questionList.length; i++){
        this.questionJson = {};
        this.questionJson.assessmentId = this.params.assessmentId;
        this.questionJson.question = questionList[i].question;
        this.questionJson.fbInputTypeCatId = questionList[i].fbInputTypeCatId;
        this.questionJson.isActive = true;
        this.questionJson.correctAnswerIds = [];
        for (let j = 0; j < questionList[i].courseQuestionOptionDTOs.length; j++){
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
            if (result.statusCode === 200){
                if (result.success) {
                    this.questions = [];
                    this.snotifyService.success(result.message, 'Success!');
                    this.getData();
                   // this.router.navigate([this.params.page],{ queryParams: { assessmentId: this.params.assessmentId } });
                }
            }else {
                this.snotifyService.error(result.message, 'Error!');
            }
        }, error => {
            this.spinner.hide();
            if (error.error.statusCode === 401){
                this.snotifyService.error(error.error.message, 'Error!');
                this.genericFunctions.logOut(this.router.url);
            }else{
                this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
            }
        });
    }
}
questionList(item): void{
    this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/view-template']);
    let queryParams = [{
        examName:this.params.examName,
        questionPaperId: this.params.questionPaperId,
            questionpaper_title: this.params.questionpaper_title,
            courseId: this.params.courseId,
            academicYearId:this.params.academicYearId,
            subjectId: this.params.subjectId,
            examId: this.params.examId,
            regulationId: this.params.regulationId,
            subjectName:this.params.subjectName,
            subjectCode : this.params.subjectCode,
            pkEQPTid: item[0].pk_exam_questionpaper_template_id
      }]
      this.parameters.viewTemplate = queryParams;
}

printQA(item): void{
    this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/print-qa']);
    let queryParams = [{
        examName:this.params.examName,
        questionPaperId: this.params.questionPaperId,
            questionpaper_title: this.params.questionpaper_title,
            courseId: this.params.courseId,
            academicYearId:this.params.academicYearId,
            subjectId: this.params.subjectId,
            examId: this.params.examId,
            regulationId: this.params.regulationId,
            subjectName:this.params.subjectName,
            subjectCode : this.params.subjectCode,
            pkEQPTid: item[0].pk_exam_questionpaper_template_id
      }]
      this.parameters.printqa = queryParams;
}

questionAnswerList(item): void{        
    
    this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/print-question-modalanswers']  ,
    { queryParams: { questionPaper: JSON.stringify(item),
        examName:this.params.examName,
        questionPaperId: this.params.questionPaperId,
        questionpaper_title: this.params.questionpaper_title,
        courseId: this.params.courseId,
        academicYearId:this.params.academicYearId,
        subjectId: this.params.subjectId,
        examId: this.params.examId,
        regulationId: this.params.regulationId,
    subjectName:this.params.subjectName,
    subjectCode : this.params.subjectCode

     },
 }

  
    );
}

goBack(): void{
    this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks']);
    let queryParams = [{
        examName:this.params.examName,
        questionPaperId: this.params.questionPaperId,
        courseId: this.params.courseId,
        academicYearId:this.params.academicYearId,
        subjectId: this.params.subjectId,
        examId: this.params.examId,
        regulationId: this.params.regulationId,
        subjectName:this.params.subjectName,
        subjectCode : this.params.subjectCode
    }]
    this.parameters.questionPaper = queryParams;
}
download(): void{
    FileSaver.saveAs('assets/docs/QuestionSheet_bulk_upload.xlsx');
}

}






