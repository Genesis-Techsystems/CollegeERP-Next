import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CampusModalComponent } from 'app/main/apps/admin/campus/campus-modal/campus-modal.component';
import { CONSTANTS } from 'app/main/common/constants';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { Router } from '@angular/router';

@Component({
  selector: 'app-view-template-questions',
  templateUrl: './view-template-questions.component.html',
  styleUrls: ['./view-template-questions.component.scss']
})
export class ViewTemplateQuestionsComponent implements OnInit {


  private examQuestionPaperDetailsUrl = CONSTANTS.examQuestionPaperDetailsUrl;
  private examQpTemplateUrl = CONSTANTS.ExamQpTemplateUrl;
  private examQpQuestionsCrudUrl = CONSTANTS.examQpQuestionsCrudUrl;

  dialogTitle;
  templateDetails = [];
  templateDetails1 = [];
  temlateListDetails = []
  totalMarks = 0;
  orderedQuestions = [];
  qpList = [];
  finalformatedList = [];

  constructor(private crudService: CrudService, private router: Router, private genericFunctions: GenericFunctions, private snotifyService: SnotifyService, private spinner: NgxSpinnerService, private dialogRef: MatDialogRef<CampusModalComponent>, @Inject(MAT_DIALOG_DATA) public details) { }

  ngOnInit(): void {
    this.dialogTitle = 'View Questions';
    if (this.details.from){
     this.getTemplateDetails()
    }else{
    this.getExamQuestionstemplate();
    }
  }


   getTemplateDetails(): void {
        this.temlateListDetails = []
        this.spinner.show();

        this.crudService.listDetailsByTwoIds(this.examQpTemplateUrl, this.details.fk_exam_qp_template_id, 'true', 'examQpTemplateId', 'isActive')
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
        this.crudService.listDetailsByTwoIds(this.examQpQuestionsCrudUrl, this.details.pk_exam_qp_id, 'true', 'ExamQp.examQpId', 'isActive')
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.data && result.data !== '') {
                        this.qpList = result.data.resultList;
                     
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

    clubTemplateWithQuestions(template: any[], questions: any[]): any[] {
        template.map(y => {
            if (questions.filter(x => (x.levelOrderNo === y.levelOrderNo && x.parentBlockId === y.parentBlockId)).length > 0) {
                y.questions = questions.filter(x => (x.levelOrderNo === y.levelOrderNo && x.parentBlockId === y.parentBlockId));
            }
        })
        return template;
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
        this.details.pk_exam_questionpaper_id,
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
