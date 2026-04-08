import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-question-bank',
  templateUrl: './question-bank.component.html',
  styleUrls: ['./question-bank.component.scss']
})
export class QuestionBankComponent implements OnInit {

  firstFormGroup: FormGroup;
  enquiryFormErrors: any;
  questionBanks = [];
  QuestionBanks = []
  questionList = [];
  questionJson: any = {};

  private assessmentCrudUrl = CONSTANTS.assessmentCrudUrl;
  private addQuestionUrl = CONSTANTS.addQuestionUrl;
  private ExamQuestionPaperMarksCrudUrl = CONSTANTS.ExamQuestionPaperMarksCrudUrl;


  params: any = {};

  constructor(private route: ActivatedRoute, private router: Router, private formBuilder: FormBuilder, private crudService: CrudService, 
    private snotifyService: SnotifyService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions) { }

  ngOnInit(): void {
    this.firstFormGroup = this.formBuilder.group({
      questionPaperId: [''],
      questionNumber: ['', Validators.required],
        questionCode: ['', Validators.required],
        question: ['', Validators.required,],
        questionMarks: ['', Validators.required],
        modelAnswer1: ['', Validators.required],
        assessmentId:[''],
        isActive: [true],
        reason: [],

    });
    this.route.queryParams
    .subscribe(params => {
        this.params = params;
        this.firstFormGroup.get('questionPaperId').setValue(params.questionPaperId)
        if (this.params.assessmentId != null){
          this.getData();
        }
    });
    this.getQb();
    this.getData();

  }
  checkInput(qu){
    let obj = {
      question : qu.courseQuestionDTO.question,
      questionMarks: qu.courseQuestionDTO.marks,
      modelAnswer1: qu.courseQuestionDTO.courseQuestionOptionDTOs[0].options,
      
    }
    this.firstFormGroup.get('question').setValue(obj.question)
    this.firstFormGroup.get('modelAnswer1').setValue(obj.modelAnswer1)
    this.firstFormGroup.get('questionMarks').setValue(obj.questionMarks)
    
  }

  getQb(){

   this.crudService.listDetailsByIdWithSort(this.assessmentCrudUrl ,true, 'DESC', 'isActive', 'createdDt')
        .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
            if (result.success) {
              this.QuestionBanks = [];
              for (let i = 0; i < result.data.resultList.length; i++){
                   if (result.data.resultList[i].isForQuestionbank && result.data.resultList[i].onlineCourseName === this.params.subjectName){
                       this.QuestionBanks.push(result.data.resultList[i]);
                   }
              }
          }  else {
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
    this.crudService.listDetailsByIdWithSort(this.assessmentCrudUrl, true, 'DESC', 'isActive', 'createdDt') 
    .subscribe(result => {
        if (result.statusCode === 200){
                  if (result.success) {
                      this.questionBanks = [];
                      for (let i = 0; i < result.data.resultList.length; i++){
                           if (result.data.resultList[i].isForQuestionbank){
                               this.questionBanks.push(result.data.resultList[i]);
                               
                           }
                      }
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

  selectedQuestionBank(assessmentId): void{
        this.questionList = this.questionBanks.filter(x => (x.assessmentId === assessmentId))[0].assessmentQuestionDTOs;
        if (this.questionList === null){
          this.questionList = [];
        }else {
          for (let i = 0; i < this.questionList.length; i++){
               this.questionList[i].check = false;
          }
        }
  }

  goBack(): void{
    this.router.navigate(['admin-examination-management/admin-pre-examinations/create-question-paper/manage-questions'] , 
    { queryParams: { questionPaperId: this.params.questionPaperId,
      questionpaper_title: this.params.questionpaper_title,  CourseCode: this.params.CourseCode,
      ExamMonthYear: this.params.ExamMonthYear,
      CourseYear: this.params.CourseYear,
      subjectcode: this.params.subjectcode,
      RegulationCode: this.params.RegulationCode,
      ExamDate: this.params.ExamDate,
      CourseGroupCode: this.params.CourseGroupCode,
      subjectName: this.params.subjectName} });
  }

  addQuestionsList(): void{
    // if(this.firstFormGroup.valid){
    //   this.crudService.addDetails(this.ExamQuestionPaperMarksCrudUrl,this.firstFormGroup.value)
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

}