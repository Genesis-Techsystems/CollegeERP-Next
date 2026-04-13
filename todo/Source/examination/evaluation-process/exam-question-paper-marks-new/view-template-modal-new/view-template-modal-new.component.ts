import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CampusModalComponent } from 'app/main/apps/admin/campus/campus-modal/campus-modal.component';
import { CONSTANTS } from 'app/main/common/constants';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-view-template-modal-new',
  templateUrl: './view-template-modal-new.component.html',
  styleUrls: ['./view-template-modal-new.component.scss']
})
export class ViewTemplateModalNewComponent implements OnInit {

 
   private examQuestionPaperDetailsUrl = CONSTANTS.examQuestionPaperDetailsUrl;
   private getExamQpTemplateAndDetailsUrl = CONSTANTS.getExamQpTemplateAndDetailsUrl;
 
   dialogTitle;
   templateDetails = [];
   templateDetails1 = [];
   totalMarks = 0;
 
   constructor(private crudService: CrudService, private snotifyService: SnotifyService, private spinner: NgxSpinnerService, private dialogRef: MatDialogRef<CampusModalComponent>, @Inject(MAT_DIALOG_DATA) public details) { }
 
   ngOnInit(): void {
     this.dialogTitle = 'Template View';
     console.log(this.details);
     if (this.details.from && this.details.from === 'QP'){
        this.getExamQPtemplate();
     }else{
        this.getExamQuestionstemplate();
     }
   }


   getExamQPtemplate(){
         this.crudService.listByIds(this.getExamQpTemplateAndDetailsUrl,  this.details.fk_exam_qp_template_id, 'examQpTemplateId', )
       .subscribe(result => {
       this.spinner.hide();
       if (result.statusCode === 200){
            if (result.success) { 
                 if (result.data.length > 0){
                    this.templateDetails = result.data[result.data.length - 1].examQpTemplateDetailsDTO;
                    this.templateDetails1 = result.data[result.data.length - 1].examQpTemplateDetailsDTO;
                    this.totalMarks = result.data[0].totalmarks
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
        }else{
            this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        }
    });
   }
 
   getExamQuestionstemplate(): void {
 
    
 
     this.templateDetails1 = []
     this.templateDetails = []
  this.crudService.listBySixteenIds(this.examQuestionPaperDetailsUrl,
         'list_exam_questionpaper_details' ,
         1, 
         '1990-01-01', 
         '1990-01-01', 
         this.details.fk_exam_questionpaper_template_id,
         0,
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
         if (result.statusCode === 200) {
           if (result.data.result && result.data.result !== '') {
             this.templateDetails = result.data.result[0];
             for (let i = 0; i < this.templateDetails.length; i++) {
               this.templateDetails1[i] = this.templateDetails[i];
             }
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
         } else {
           this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
         }
       });
   }
 
   Close() {
     this.dialogRef.close("refresh");
   }

}
