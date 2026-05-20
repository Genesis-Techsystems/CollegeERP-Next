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

@Component({
  selector: 'app-manage-questions',
  templateUrl: './manage-questions.component.html',
  styleUrls: ['./manage-questions.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations   : fuseAnimations
})

export class ManageQuestionsComponent implements OnInit {
  displayedColumns: string[] = ['id','QuestionNumber','QuestionCode','Question','QuestionMarks','ModelAnswer', 'isActive', 'edit'];
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
  params: any = {};
  @ViewChild('excelAvatar') excelAvatar: ElementRef;
  examQuestionpapermarks: any[];
    examQuestionpapersmarks1=[];

  constructor(private route: ActivatedRoute, private router: Router, private formBuilder: FormBuilder, private crudService: CrudService, private dialog: MatDialog,
    private snotifyService: SnotifyService, private _location: Location, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions) { }

  ngOnInit(): void {
    this.firstFormGroup = this.formBuilder.group({
      hour: ['00'],
      minute: ['00'],
      noOfMaxAttempts: [0],
      totalQuestions: [0],
      minMarksToPass: [0],
      minMarksPercentage: [0],
    });
    this.route.queryParams
    .subscribe(params => {
         this.params = params;
         
        if (!this.isEmptyObject(params)) {
            this.params.CourseCode=params.CourseCode,
            this.params.ExamMonthYear = params.ExamMonthYear;
            this.params.CourseYear = params.CourseYear;
            this.params.subjectcode = params.subjectcode;
            this.params.RegulationCode = params.RegulationCode;
            this.params.ExamDate = params.ExamDate;
            this.params.CourseGroupCode = params.CourseGroupCode;
            this.params.questionPaperId = params.questionPaperId;
            this.params.subjectName = params.subjectName;
        }
    });
    this.dataSource = new MatTableDataSource(this.examQuestionpapersmarks);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.getExamQuestionpapermarks();
}

  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  getExamQuestionpapermarks(): void{
    this.examQuestionpapersmarks1=[]
    this.examQuestionpapersmarks =[]
    /*----------- ExamQuestionpapers -----------*/
    this.crudService.listDetailsByTwoIds(this.ExamQuestionPaperMarksCrudUrl, this.params.questionPaperId,true, 'ExamQuestionPapers.questionPaperId','isActive')
    .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
                if (result.data.resultList && result.data.resultList !== '') {
                    this.examQuestionpapersmarks = result.data.resultList;
                    for(let i=0;i<this.examQuestionpapersmarks.length;i++){                           
                            this.examQuestionpapersmarks1.push(this.examQuestionpapersmarks[i]);
                    }
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

  addQuestion(): void{
    this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/add-manual-questions'],
    { queryParams: { questionPaperId: this.params.questionPaperId,
        questionpaper_title: this.params.questionpaper_title,
        CourseCode: this.params.CourseCode,
        ExamMonthYear: this.params.ExamMonthYear,
        CourseYear: this.params.CourseYear,
        subjectcode: this.params.subjectcode,
        RegulationCode: this.params.RegulationCode,
        ExamDate: this.params.ExamDate,
        CourseGroupCode: this.params.CourseGroupCode,
        subjectName: this.params.subjectName
     } }

        );
}
questionBank(): void{
  this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/question-bank'],
  { queryParams: { questionPaperId: this.params.questionPaperId,
    questionpaper_title: this.params.questionpaper_title,
    CourseCode: this.params.CourseCode,
    ExamMonthYear: this.params.ExamMonthYear,
    CourseYear: this.params.CourseYear,
    subjectcode: this.params.subjectcode,
    RegulationCode: this.params.RegulationCode,
    ExamDate: this.params.ExamDate,
    CourseGroupCode: this.params.CourseGroupCode,
    subjectName: this.params.subjectName
} });
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
    
    this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/view-questions']  ,
    { queryParams: { questionPaper: JSON.stringify(item),
        questionPaperId: this.params.questionPaperId,
        questionpaper_title: this.params.questionpaper_title,
        CourseCode: this.params.CourseCode,
        academicYearId:this.params.academicYearId,
    ExamMonthYear: this.params.ExamMonthYear,
    CourseYear: this.params.CourseYear,
    subjectcode: this.params.subjectcode,
    RegulationCode: this.params.RegulationCode,
    ExamDate: this.params.ExamDate,
    CourseGroupCode: this.params.CourseGroupCode,
    subjectName:this.params.subjectName

     },
 }

  
    );
}

printQA(item): void{        
    
    this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/print-question-modalanswers']  ,
    { queryParams: { questionPaper: JSON.stringify(item),
        questionPaperId: this.params.questionPaperId,
        questionpaper_title: this.params.questionpaper_title,
        CourseCode: this.params.CourseCode,
        academicYearId:this.params.academicYearId,
    ExamMonthYear: this.params.ExamMonthYear,
    CourseYear: this.params.CourseYear,
    subjectcode: this.params.subjectcode,
    RegulationCode: this.params.RegulationCode,
    ExamDate: this.params.ExamDate,
    CourseGroupCode: this.params.CourseGroupCode,
    subjectName:this.params.subjectName

     },
 }

  
    );
}

goBack(): void{
    this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks'], { 
        queryParams: {
            questionPaperId: this.params.questionPaperId,
           CourseCode: this.params.CourseCode,
           academicYearId:this.params.academicYearId,
           ExamMonthYear: this.params.ExamMonthYear,
           CourseYear: this.params.CourseYear,
           subjectcode: this.params.subjectcode,
           RegulationCode: this.params.RegulationCode,
           ExamDate: this.params.ExamDate,
           CourseGroupCode: this.params.CourseGroupCode,
           subjectName:this.params.subjectName

        } 
    });
}
download(): void{
    FileSaver.saveAs('assets/docs/QuestionSheet_bulk_upload.xlsx');
}

}






