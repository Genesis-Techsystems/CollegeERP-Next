
import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { ParametersService } from 'app/main/services/parameters.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { QuestionTypeModalComponent } from '../../exam-question-paper-marks/question-bank/question-type-modal/question-type-modal.component';

@Component({
  selector: 'app-question-bank-new',
  templateUrl: './question-bank-new.component.html',
  styleUrls: ['./question-bank-new.component.scss']
})
export class QuestionBankNewComponent implements OnInit {

  firstFormGroup: FormGroup;
  enquiryFormErrors: any;
  questionBanks = [];
  QuestionBanks = []
  questionList = [];
  questionJson: any = {};

  private assessmentCrudUrl = CONSTANTS.assessmentCrudUrl;
  private addExamQpQuestionsListUrl = CONSTANTS.addExamQpQuestionsListUrl;
  private ExamQuestionPaperMarksCrudUrl = CONSTANTS.ExamQuestionPaperMarksCrudUrl;


  params: any = {};
  constructor(private route: ActivatedRoute, private router: Router, private formBuilder: FormBuilder, private crudService: CrudService,  private dialog: MatDialog,
    private snotifyService: SnotifyService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions, private parameters: ParametersService) { }

  ngOnInit(): void {
    this.firstFormGroup = this.formBuilder.group({
        questionPaperId: [''],
        levelno: [''],
        levelOrderNo: [''],
        parentBlockId: [''],
        groupNo: [''],
        subGroupNo: [''],
        questionNumber: [''],
        questionCode: [''],
        subQuestionCode: [''],
        question: ['', Validators.required,],
        questionMarks: [''],
        modelAnswer1: ['', Validators.required],
        courseQuestionId: ['', Validators.required],
        assessmentId:[''],
        questionOwnerProfileId:[''],
        isActive: [true],
        reason: [],

    });
    if (this.parameters.questionBank) {
      this.params = this.parameters.questionBank[0];
      this.firstFormGroup.get('questionPaperId').setValue(this.params.questionPaperId)
      this.firstFormGroup.get('levelno').setValue(this.params.levelno)
      this.firstFormGroup.get('levelOrderNo').setValue(this.params.levelOrderNo)
      this.firstFormGroup.get('parentBlockId').setValue(this.params.parentBlockId)
      this.firstFormGroup.get('groupNo').setValue(this.params.groupno)
      this.firstFormGroup.get('subGroupNo').setValue(this.params.subgroupno)
      this.firstFormGroup.get('questionNumber').setValue(this.params.questionnumber)
      this.firstFormGroup.get('questionCode').setValue(this.params.questioncode)
      this.firstFormGroup.get('subQuestionCode').setValue(this.params.subquestioncode)
      this.firstFormGroup.get('questionMarks').setValue(this.params.iqm)     
       this.firstFormGroup.get('questionOwnerProfileId').setValue(+localStorage.getItem('employeeId'))
      if (this.params.assessmentId != null){
        // this.getQb();
      }
    }
    else{
      this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks-new']);
    }
    this.getQb();

  }
  checkInput(qu){
    let obj = {
      question : qu.courseQuestionDTO.question,
      questionMarks: qu.courseQuestionDTO.marks,
      modelAnswer1: qu.courseQuestionDTO.courseQuestionOptionDTOs[0].options,
      courseQuestionId: qu.courseQuestionDTO.courseQuestionId,
    }
    this.firstFormGroup.get('question').setValue(obj.question)
    this.firstFormGroup.get('modelAnswer1').setValue(obj.modelAnswer1)
    this.firstFormGroup.get('questionMarks').setValue(obj.questionMarks)
    this.firstFormGroup.get('courseQuestionId').setValue(obj.courseQuestionId)
  }

  getQb(){
this.spinner.show();
   this.crudService.listDetailsByTwoIdWithSort(this.assessmentCrudUrl ,this.params.subjectCode,true, 'DESC', 'onlineCourses.onlineCourseCode','isActive','createdDt')
        .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
            if (result.success) {
              this.QuestionBanks = [];
              this.QuestionBanks=result.data.resultList
              // this.QuestionBanks=result.data.resultList.filter(x=>x.onlineCourseName.toLowerCase()===this.params.subjectName.toLowerCase() && x.isForQuestionbank)
              // for (let i = 0; i < result.data.resultList.length; i++){
              //      if (result.data.resultList[i].isForQuestionbank && result.data.resultList[i].onlineCourseName === this.params.subjectName){
              //          this.QuestionBanks.push(result.data.resultList[i]);
              //      }
              // }
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



  selectedQuestionBank(assessmentId): void{
        this.questionList = this.QuestionBanks.filter(x => (x.assessmentId === assessmentId))[0].assessmentQuestionDTOs;
        if (this.questionList === null){
          this.questionList = [];
        }else {
          for (let i = 0; i < this.questionList.length; i++){
               this.questionList[i].check = false;
          }
        }
  }

  goBack(): void{
    this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks-new/manage-questions-new']);

      let queryParams = [{
        examName:this.params.exam_name,
        questionPaperId: this.params.questionPaperId,
      questionpaper_title: this.params.questionpaper_title,  
      courseId: this.params.courseId,
      academicYearId:this.params.academicYearId,
      subjectId: this.params.subjectId,
      examId: this.params.examId,
      regulationId: this.params.regulationId,
    subjectName: this.params.subjectName,
    templateId: this.params.templateId,
    subjectCode:this.params.subjectCode
    }]
    this.parameters.manageQuestions = queryParams;
  }

  addQuestionsList(): void{
      const dialogRef = this.dialog.open(QuestionTypeModalComponent, {
        width: '550px',
        data: [this.firstFormGroup.value]
    });
    dialogRef.afterClosed().subscribe(details => {
        if (details != null && details !== ''){
            this.spinner.show();
            console.log(details);
            details.examQpId = this.params.examQPId;
            details.isActive = true;
            details.levelNo = details.levelno;
            details.taxonomylevelCatdetId = details.taxonomyLevelCatDetId;
            details.questionDifficultyCatdetId = details.questionDifficultyCatDetId;
            details.questiontypeCatdetId = null;
            details.questionNumber = null;
            details.questionCode = null;
            details.examQuestionGroupId = null;
            details.subUnitsId = null;
            details.createdDt = new Date();
            details.subquestionCode = null;
            if(details){
              let obj = [];
              obj.push(details);
              this.crudService.add(this.addExamQpQuestionsListUrl,obj)
              .subscribe(result => {
                  this.spinner.hide();
                  if (result.statusCode === 200){
                      if (result.success) {
                          this.snotifyService.success(result.message, 'Success!');
                          this.goBack();
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
            }else{
              this.snotifyService.error("Please Select Required Fields");
            }
    
        }
    });
    
        
 

}

}




