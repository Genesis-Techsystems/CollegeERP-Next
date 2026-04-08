import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import {Location} from '@angular/common';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatRipple } from '@angular/material/core';

@Component({
  selector: 'app-manual-questions',
  templateUrl: './manual-questions.component.html',
  styleUrls: ['./manual-questions.component.scss']
})
export class ManualQuestionsComponent implements OnInit {

  @ViewChild(MatIcon) icon: MatIcon;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatRipple) ripple: MatRipple;

  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private isActive = CONSTANTS.isActive;
  private questionType = CONSTANTS.questionType;
  // private ExamQuestionPaperMarksCrudUrl = CONSTANTS.ExamQuestionPaperMarksCrudUrl;

  QuestionFormGroup: FormGroup;
  selectedItem = 'TF';
  check = 1;
  params: any = {};
  multiChoices = [
    {id: 1, inputHead: 'Choice 1', isCorrectAnswer: false, options: '',courseQuestionOptionId: null, isActive: true},
    {id: 2, inputHead: 'Choice 2', isCorrectAnswer: false, options: '',courseQuestionOptionId: null, isActive: true},
    {id: 3, inputHead: 'Choice 3', isCorrectAnswer: false, options: '',courseQuestionOptionId: null, isActive: true},
    {id: 4, inputHead: 'Choice 4', isCorrectAnswer: false, options: '',courseQuestionOptionId: null, isActive: true}
  ]
  question = '';
  questionTypes = [];
  choiceAnwers = [
    {id: 1,name: 'Answer 1', options: '',courseQuestionOptionId: null, isActive: true},
    {id: 2,name: 'Answer 2', options: '',courseQuestionOptionId: null, isActive: true},
    {id: 3,name: 'Answer 3', options: '',courseQuestionOptionId: null, isActive: true},
    {id: 4,name: 'Answer 4', options: '',courseQuestionOptionId: null, isActive: true}
  ];
  booleans = [
    {id: 1, options: 'True', isCorrectAnswer: false,courseQuestionOptionId: null, isActive: true},
    {id: 2, options: 'False', isCorrectAnswer: false,courseQuestionOptionId: null, isActive: true}
  ]
  explanation = '';
  questionJson: any = {};
  assessment = [];
  flag = false;
  addedQuestion: any = {};
  courseQuestionOptionId = null;
  marks = 0;

  constructor(private _location: Location, private formBuilder: FormBuilder,
    private crudService: CrudService, private snotifyService: SnotifyService, private spinner: NgxSpinnerService,
    private genericFunctions: GenericFunctions, private router: Router, private route: ActivatedRoute) { 
    
  }

  ngOnInit(): void {
    this.QuestionFormGroup = this.formBuilder.group({
      questionPaperId: [''],
      questionNumber: ['', Validators.required],
        questionCode: ['', Validators.required],
        question: ['', Validators.required,],
        questionMarks: ['', Validators.required],
        modelAnswer1: ['', Validators.required],
        isActive: [true],
        reason: [],
    
    });

    this.route.queryParams
            .subscribe(params => {
                this.params = params;
                this.QuestionFormGroup.get('questionPaperId').setValue(params.questionPaperId)
                
                if (this.params.questionPaperMarksId != null){
                  
                  this.getData();
                }else{
                  this.generalDetails();
                }
            });
  }

  getData(): void{
    // this.flag = false;
    // this.addedQuestion = {};
    // this.crudService.listDetailsByTwoIds(this.ExamQuestionPaperMarksCrudUrl, this.params.questionPaperId,this.params.questionPaperMarksId , 'ExamQuestionPapers.questionPaperId','questionPaperMarksId')
    // .subscribe(result => {
    //     if (result.statusCode === 200){
    //               if (result.success) {
    //                   this.flag = true;
    //                   this.assessment = result.data.resultList;
    //                   if (this.assessment.length > 0){
    //                     this.booleans=[]
    //                     this.selectedItem = 'SUB'
    //                     this.QuestionFormGroup.get('questionNumber').setValue( this.assessment[0].questionNumber)
    //                     this.QuestionFormGroup.get('questionCode').setValue( this.assessment[0].questionCode)
    //                     this.QuestionFormGroup.get('question').setValue( this.assessment[0].question)
    //                     this.QuestionFormGroup.get('questionMarks').setValue( this.assessment[0].questionMarks)



    //                     this.explanation =  this.assessment[0].modelAnswer1
    //                     this.courseQuestionOptionId = this.addedQuestion.courseQuestionDTO.courseQuestionOptionDTOs[0].courseQuestionOptionId;
                   
    //                   }
    //               } else {
    //                   this.snotifyService.success(result.message, 'Success!');
    //               }
    //           }else {
    //               this.snotifyService.error(result.message, 'Error!');
    //           }
    //   }, error => {
    //       if (error.error.statusCode === 401){
    //           this.snotifyService.error(error.error.message, 'Error!');
    //           this.genericFunctions.logOut(this.router.url);
    //       }else{
    //           this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
    //       }
    //   });
  }

  generalDetails(): void{
    /*----------- QUESTION TYPES -----------*/
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.questionType , 'true', this.generalDetailsByCodeUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.questionTypes = result.data.resultList;
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

  listClick(e, item): void{
    this.selectedItem = item.generalDetailCode;
  }

  
addQuestion(){
  // if(this.QuestionFormGroup.valid){
  //   this.crudService.addDetails(this.ExamQuestionPaperMarksCrudUrl,this.QuestionFormGroup.value)
  //   .subscribe(result => {
  //       this.spinner.hide();
  //       if (result.statusCode === 200){
  //           if (result.data && result.data !== '') {
  //               this.snotifyService.success(result.message, 'Success!');
  //               this.goBack();
  //           }
  //       }else {
  //           this.snotifyService.error(result.message, 'Error!');
  //       }
  //   }, error => {
  //       this.spinner.hide();
  //       if (error.error.statusCode === 401){
  //           this.snotifyService.error(error.error.message, 'Error!');
  //           this.genericFunctions.logOut(this.router.url);
  //       }else{
  //           this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
  //       }
  //   });
  // }else{
  //   this.snotifyService.error("Please Select Required Fields");
  // }
}
  goBack(){
    this.router.navigate(['admin-examination-management/admin-pre-examinations/create-question-paper/manage-questions'] , 
    { queryParams: { questionPaperId: this.params.questionPaperId,
      questionpaper_title: this.params.questionpaper_title,
      CourseCode: this.params.CourseCode,
           ExamMonthYear: this.params.ExamMonthYear,
           CourseYear: this.params.CourseYear,
           subjectcode: this.params.subjectcode,
           RegulationCode: this.params.RegulationCode,
           ExamDate: this.params.ExamDate,
           CourseGroupCode: this.params.CourseGroupCode,
         subjectName:this.params.subjectName,
  } }
    );
  }

}
