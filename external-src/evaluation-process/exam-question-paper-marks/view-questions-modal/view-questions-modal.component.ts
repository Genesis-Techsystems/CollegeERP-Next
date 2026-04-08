import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { CampusModalComponent } from 'app/main/apps/admin/campus/campus-modal/campus-modal.component';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';


@Component({
  selector: 'app-view-questions-modal',
  templateUrl: './view-questions-modal.component.html',
  styleUrls: ['./view-questions-modal.component.scss']
})
export class ViewQuestionsModalComponent implements OnInit {

  private ExamQuestionPaperMarksCrudUrl = CONSTANTS.ExamQuestionPaperMarksCrudUrl;
  params: any = {};
  examQuestionpapermarks: any[];
  questionPaper: any= [];
  questions = [];
  marks : [];
  examQuestionpapersmarks :any[] = [];
  examQuestionpapersmarks1 :any[] = [];
  dialogTitle;
  panelOpenState = true;
  questionJson: any = {};
  public formData;

  constructor(private route: ActivatedRoute, private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, private dialogRef: MatDialogRef<CampusModalComponent>,
               @Inject(MAT_DIALOG_DATA) public details, private snotifyService: SnotifyService,
               private crudService: CrudService, public router: Router, private spinner: NgxSpinnerService)
                {

  }


  ngOnInit(): void {
    this.dialogTitle = 'Questions';
    this.getExamQuestionpapermarks();

  }

  getExamQuestionpapermarks(): void{
    this.examQuestionpapersmarks1=[]
    this.examQuestionpapersmarks =[]
    /*----------- ExamQuestionpapers -----------*/
    // listDetailsByIdsWithSort
    this.crudService.listDetailsByTwoIds(this.ExamQuestionPaperMarksCrudUrl, this.details.pk_exam_questionpaper_id,true, 'ExamQuestionPapers.questionPaperId','isActive')
    .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
                if (result.success) {
                    this.examQuestionpapersmarks = result.data.resultList;
                    for(let i=0;i<this.examQuestionpapersmarks.length;i++){
                        if(this.examQuestionpapersmarks[i].questionPaperId==this.details.pk_exam_questionpaper_id
                          ){                            
                            this.examQuestionpapersmarks1.push(this.examQuestionpapersmarks[i])
                                                       
                        }
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


  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
      return (obj && (Object.keys(obj).length === 0));
  }
  
  editQuestion(item): void{
    this.dialogRef.close();
    this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/add-manual-questions']
    , { queryParams: { questionPaperId: item.questionPaperId, questionPaperMarksId: item.questionPaperMarksId, questionpaper_title:this.details.questionpaper_title,
        permission: 'Edit', page: this.details.page } }
        );
  }

  delQuestion(item): void{
    let obj={
      questionNumber:item.questionNumber,
      questionCode:item.questionNumber,
      question:item.questionNumber,
      questionMarks:item.questionNumber,
      modelAnswer1:item.questionNumber,
      isActive:false,
      reason:null

    }
    this.crudService.updateDetails(this.ExamQuestionPaperMarksCrudUrl, obj,item.questionPaperMarksId , 'questionPaperMarksId')

              .subscribe(result => {
                  this.spinner.hide();
                  if (result.statusCode === 200){
                      if (result.success) {
                          this.snotifyService.success(result.message, 'Success!');
                          this.getExamQuestionpapermarks()
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
  Close(){
    this.dialogRef.close("refresh");

  }


}
