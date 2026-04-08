import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { ParametersService } from 'app/main/services/parameters.service';
import { log } from 'util';

@Component({
  selector: 'app-assign-question-template',
  templateUrl: './assign-question-template.component.html',
  styleUrls: ['./assign-question-template.component.scss']
})
export class AssignQuestionTemplateComponent implements OnInit {
  displayedColumns: string[] = ['id', 'questionNo', 'subQuestion', 'question', 'totalMarks'];
  dataSource: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private ExamQuestionpaperTemplateUrl = CONSTANTS.ExamQuestionpaperTemplateUrl;
  private ExamQuestionPaperTemplateDetailsUrl = CONSTANTS.ExamQuestionPaperTemplateDetailsUrl;
  private ExamQPtempAssignUrl = CONSTANTS.ExamQPtempAssignUrl;
  private examQuestionPaperDetailsUrl = CONSTANTS.examQuestionPaperDetailsUrl;


  TemplateList: any;
  TemplateDetails: any;
  template: any;
  QuestionPaper: any;
  templateForm: FormGroup;
  isShow: boolean = false;
  isSelect: boolean = false;
  templateId: any;
  questionPaperId: any;
  questionpaper_title: any;

  params: any = {};
  paperTemplate = [];
  paperTemplate1 = [];
  templateDetails = [];
  templateDetails1 = [];
  TemplateDuplicateList = [];
  data:any
  title:any
  isEdit:boolean=false
  selectedIndex: number = 0; 

  constructor(private route: ActivatedRoute, private router: Router, private crudService: CrudService, private formBuilder: FormBuilder, private spinner: NgxSpinnerService, private snotifyService: SnotifyService, private genericFunctions: GenericFunctions, private parameters: ParametersService) { }

  ngOnInit(): void {
    this.templateForm = this.formBuilder.group({
      examQuestionPaperTemplateId: ['', Validators.required],
    })
    if (this.parameters.questionPaperTemplateDetails) {
      this.params = this.parameters.questionPaperTemplateDetails[0];
      this.data =  this.params.rowData

    if(this.data.fk_exam_questionpaper_template_id !== null){
      this.title = "Update Template"
      this.isEdit = true
    }else {
      this.title = "Assign Template"
      this.isEdit = false
    }
      
    } else {
      this.router.navigate(['admin-examination-management/evaluation-process/assign-questionpaper-template']);
    }

    // this.route.queryParams
    //   .subscribe(params => {
    //     this.params = params;
    //     if (!this.isEmptyObject(params)) {
    //       this.params.CourseCode = params?.CourseCode,
    //         this.params.ExamMonthYear = params.ExamMonthYear;
    //       this.params.CourseYear = params.CourseYear;
    //       this.params.subjectcode = params.subjectcode;
    //       this.params.RegulationCode = params.RegulationCode;
    //       this.params.ExamDate = params.ExamDate;
    //       this.params.CourseGroupCode = params.CourseGroupCode;
    //       this.params.questionPaperId = params.questionPaperId;
    //       this.params.subjectName = params.subjectName;
    //     }
    //   });
    this.questionPaperId = this.params.questionPaperId;
    this.questionpaper_title = this.params.questionpaper_title;
    this.getTemplateList();
  }

  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  getTemplateList() {
    this.spinner.show();
    this.crudService.TemplateDetails(this.ExamQuestionpaperTemplateUrl, "examQuestionPaperTemplateId=ASC")
        .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
                if (result.data.resultList && result.data.resultList !== '') {
                    this.TemplateList = result.data.resultList;
                    this.TemplateDuplicateList = [...this.TemplateList];

                    if (!this.isEmptyObject(this.data) && this.isEdit && this.TemplateList.length > 0) {

                        // Find the index of the selected template
                        const selectedIndex = this.TemplateList.findIndex(t => 
                            t.examQuestionPaperTemplateId === this.data.fk_exam_questionpaper_template_id
                        );

                        if (selectedIndex !== -1) {
                            this.selectedIndex = selectedIndex;
                            this.selectionTemplate(this.data.fk_exam_questionpaper_template_id, selectedIndex);
                        }
                    } else if (this.TemplateList.length > 0) {
                        this.selectionTemplate(this.TemplateList[0].examQuestionPaperTemplateId, 0);
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

  searchTemplate(value) {
    this.TemplateDuplicateList = []
    this.search(value);
  }
  search(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.TemplateList.length; i++) {
      let option = this.TemplateList[i];
      if (option.templateTitle.toLowerCase().indexOf(filter) >= 0) {
        this.TemplateDuplicateList.push(option);
      }
    }
  }

selectionTemplate(event: any, index?: number) {

    this.isShow = true;
    this.isSelect = false;
    this.templateId = event;

    // Set the selected tab index
    if (index !== undefined) {
        this.selectedIndex = index;
    }

    this.paperTemplate1 = [];
    this.paperTemplate = [];

    this.crudService.listBySixteenIds(
        this.examQuestionPaperDetailsUrl,
        'list_exam_questionpaper_details',
        1,
        '1990-01-01',
        '1990-01-01',
        this.templateId,
        0, 0, 0, 0, 0,
        '1990-01-01', 0, 0, 0, 0, 0,
        'in_flag', 'in_orgid', 'in_fdate', 'in_tdate',
        'in_exam_questionpaper_template_id', 'in_exam_questionpaper_id',
        'in_exam_id', 'in_course_year_id', 'in_subject_id',
        'in_evalutor_profileid', 'in_exam_date', 'in_regulation_id',
        'in_emp_id', 'in_questionpaper_id', 'in_evaluator_role_id',
        'in_exam_evaluationassignment_id'
    ).subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
            if (result.data.result && result.data.result !== '') {
                this.paperTemplate = result.data.result[0];
                this.paperTemplate1 = [...this.paperTemplate];
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
assigntemplate(){
    this.isShow = true;
    this.isSelect = true;
    let reqest =
    {
      "examMasterId": this.params.examId,
      "regulationId": this.params.regulationId,
      "subjectId": this.params.subjectId,
      "examQuestionpaperTemplateId": this.templateId,
      "courseYearId": this.params.courseYearId,
      "isActive": true
    }
    this.crudService.addDetails(this.ExamQPtempAssignUrl, reqest)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.snotifyService.success(result.message, 'Success!');
            this.goBack()
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

  updateTemplate(): void {
    this.isShow = true;
    this.isSelect = true;
    let details =
    {
      "examQptempAssignId":this.data.fk_exam_questionpaper_template_id,
      "examMasterId": this.params.examId,
      "regulationId": this.params.regulationId,
      "subjectId": this.params.subjectId,
      "examQuestionpaperTemplateId": this.templateId,
      "courseYearId": this.params.courseYearId,
      "isActive": true
    }
    this.spinner.show();
    this.crudService.updateDetails(this.ExamQPtempAssignUrl, details,this.data.fk_exam_questionpaper_template_id,'examQptempAssignId')
        .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
                    this.snotifyService.success(result.message, 'Success!');
                    this.goBack()

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



  questionBank(groupno: any, questioncode: any): void {
    this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/question-bank']);
    let queryParams = [{
      examName: this.params.exam_name,
      questionPaperId: this.params.questionPaperId,
      questionpaper_title: this.params.questionpaper_title,
      CourseCode: this.params.CourseCode,
      academicYearId: this.params.academicYearId,
      ExamMonthYear: this.params.ExamMonthYear,
      CourseYear: this.params.CourseYear,
      subjectcode: this.params.subjectcode,
      RegulationCode: this.params.RegulationCode,
      ExamDate: this.params.ExamDate,
      CourseGroupCode: this.params.CourseGroupCode,
      subjectName: this.params.subjectName,
      groupno: groupno,
      questioncode: questioncode
    }]
    this.parameters.questionBank = queryParams;
  }

  addQuestion(groupno: any, questioncode: any): void {
    this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/add-manual-questions']);
    let queryParams = [{
      examName: this.params.exam_name,
      questionPaperId: this.params.questionPaperId,
      questionpaper_title: this.params.questionpaper_title,
      CourseCode: this.params.CourseCode,
      academicYearId: this.params.academicYearId,
      ExamMonthYear: this.params.ExamMonthYear,
      CourseYear: this.params.CourseYear,
      subjectcode: this.params.subjectcode,
      RegulationCode: this.params.RegulationCode,
      ExamDate: this.params.ExamDate,
      CourseGroupCode: this.params.CourseGroupCode,
      subjectName: this.params.subjectName,
      groupno: groupno,
      questioncode: questioncode
    }]
    this.parameters.manualQuestions = queryParams;
  }

  goBack(): void {
    this.router.navigate(['admin-examination-management/evaluation-process/assign-questionpaper-template']);
    let queryParams = [{
      courseId: this.params.courseId,
      academicYearId: this.params.academicYearId,
      subjectId: this.params.subjectId,
      examId: this.params.examId,
      courseYearId: this.params.courseYearId,
      regulationId: this.params.regulationId,
      subjectName: this.params.subjectName
    }]
    this.parameters.questionPaperTemplateDetails = queryParams;
  }

}
