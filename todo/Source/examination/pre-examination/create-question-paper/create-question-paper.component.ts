import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatRipple } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-create-question-paper',
  templateUrl: './create-question-paper.component.html',
  styleUrls: ['./create-question-paper.component.scss']
})
export class CreateQuestionPaperComponent implements OnInit {
  displayedColumns: string[] = ['id', 'questionPaperTitle', 'setNumber', 'passMarks','totalMarks','Actions'];
  Questions = [{
    id:'1',questionPaperTitle:'1a',setNumber:'a',passMarks:'what are the directives in Angular ?',totalMarks:'10'
  }]
  dataSource: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatRipple) ripple: MatRipple;
  @ViewChild('empPhoto') studentAvatar: ElementRef;

  private EvaluatorRole=CONSTANTS.EvaluatorRole;
  private getExamEvaluationCodesUrl = CONSTANTS.getExamEvaluationCodesUrl;
  
  questionPaperForm: FormGroup;
  questionPaperFilterForm: FormGroup;
  listExamSubject: any;
  monthYear=[];
  courseCode: any;
  courseyearcode: any;
  subjectcode: any;
  RegulationCode : any [];
  ExamDate : any [];
  CourseGroupCode : any [];
  monthYear1=[];
  flag : true;
    courseyearcode1: any [];
    subjectcode1: any[];
    Groupcode1: any[];
    Regulationcode1: any[];
    examdate1: any;
    groupCode1: any[];
    CourseCode: any;
  formData: FormData;
  pageParams :any;
  role: any;
  examEvaluatorProfileId: any = 0;
  employeeId: any = 0;
  subjectName: any;
  constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private router: Router, private dialog: MatDialog, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions,) {
  }

  ngOnInit(): void {
    this.questionPaperForm = this.formBuilder.group({
      questionPaperId :[''],
      CourseCode:['', Validators.required],
      ExamMonthYear:['', Validators.required],
      CourseYear:['', Validators.required],
      subjectcode:['', Validators.required],
      RegulationCode :  ['', Validators.required],
      ExamDate : ['', Validators.required],
      CourseGroupCode : ['', Validators.required],
});
    this.questionPaperFilterForm = this.formBuilder.group({
      in_orgid:[1],
      in_fdate:['1990-01-01'],
      in_tdate:['1990-01-01'],
      in_exam_month_yr:[''],
      in_course_code:[''],
      in_course_year_code:[''],
      in_subject_code:[''],
      in_evalutor_profileid:[this.examEvaluatorProfileId],
      in_exam_date:['1990-01-01'],
      in_regulation_code:[''],
      in_emp_id:[this.employeeId],
      in_questionpaper_id:[0],
    });
    this.route.queryParams
    .subscribe(params => {
      this.pageParams = params;
      
    });
    this.dataSource = new MatTableDataSource(this.Questions);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.getQuestionpaperFilterss();
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

  // STOREPROCEDURE FOR FILTERS

   getQuestionpaperFilterss(): void{
    if ( this.questionPaperFilterForm.valid){
      this.flag = true;
      let empId = +localStorage.getItem('employeeId');
      this.crudService.listByEighteenIds(this.getExamEvaluationCodesUrl, 
           'list_exam_subjects' ,
           this.questionPaperFilterForm.value.in_orgid, 
         this.questionPaperFilterForm.value.in_fdate, 
         this.questionPaperFilterForm.value.in_tdate, 
         this.questionPaperFilterForm.value.in_exam_month_yr, 
         this.questionPaperFilterForm.value.in_course_code,
         this.questionPaperFilterForm.value.in_course_year_code, 
         this.questionPaperFilterForm.value.in_subject_code,
         this.questionPaperFilterForm.value.in_evalutor_profileid,
         this.questionPaperFilterForm.value.in_exam_date,
         this.questionPaperFilterForm.value.in_regulation_code,
         this.questionPaperFilterForm.value.in_emp_id, 
         this.questionPaperFilterForm.value.in_questionpaper_id , 
        this.EvaluatorRole,'','',1,empId,
         'in_flag', 'in_orgid' ,'in_fdate', 'in_tdate', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code','in_subject_code', 'in_evalutor_profileid','in_exam_date','in_regulation_code','in_emp_id','in_questionpaper_id','in_evaluator_role_id','in_academic_year','in_exam_short_name','in_affiliatedto_catdet_id',
         'in_loginuser_empid'
          )
       .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
                if (result.data && result.data !== '' && result.data.result.length > 0) {
                    this.listExamSubject =  result.data.result[0];
                    
                    const CourseCode = this.listExamSubject.map(({ course_code }) => course_code);
                    this.CourseCode = this.listExamSubject.filter(({ course_code }, index) =>
                       !CourseCode.includes(course_code, index + 1));

                       if(!this.isEmptyObject(this.pageParams)){
                          this.questionPaperForm.get('CourseCode').setValue(this.pageParams.CourseCode);
                          this.questionPaperForm.get('ExamMonthYear').setValue(this.pageParams.ExamMonthYear);
                          this.questionPaperForm.get('CourseYear').setValue(this.pageParams.CourseYear);
                          this.questionPaperForm.get('CourseGroupCode').setValue(this.pageParams.CourseGroupCode);
                          this.questionPaperForm.get('subjectcode').setValue(this.pageParams.subjectcode);
                          this.questionPaperForm.get('RegulationCode').setValue(this.pageParams.RegulationCode);
                          this.questionPaperForm.get('ExamDate').setValue(this.pageParams.ExamDate);
                          this.questionPaperForm.get('questionPaperId').setValue(this.pageParams.questionPaperId);
                        this.selectedCourse(this.pageParams.CourseCode);
                        this.selectedMonthyr(this.pageParams.ExamMonthYear);
                        this.selectedCourseYr(this.pageParams.CourseYear);
                        this.selectedgroupCode(this.pageParams.CourseGroupCode);
                        this.selectedregulationCode(this.pageParams.RegulationCode);
                        this.selectedDate(this.pageParams.ExamDate);
                        this.selectedSubject(this.pageParams.subjectcode);
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
}

selectedCourse(courseCodeId){
    this.monthYear=[];
    this.monthYear1=[]
    if (this.isEmptyObject(this.pageParams)){
      this.questionPaperForm.get('ExamMonthYear').setValue('')
    }
  
    for(let i=0;i<this.listExamSubject.length;i++){
              if(this.listExamSubject[i].course_code==courseCodeId){
                    this.monthYear1.push(this.listExamSubject[i])
                    const exam_month_yrData = this.monthYear1.map(({ exam_month_yr }) => exam_month_yr);
                    this.monthYear = this.monthYear1.filter(({ exam_month_yr }, index) =>
                    !exam_month_yrData.includes(exam_month_yr, index + 1));
                    this.monthYear = this.monthYear.sort((a, b) => a.exam_month_yr - b.exam_month_yr);
              }
    }
  }

  selectedMonthyr(exam_month_yr){
    this.courseyearcode1=[]
    this.courseyearcode=[]
    if (this.isEmptyObject(this.pageParams)){
    this.questionPaperForm.get('CourseYear').setValue('')
    }
    for(let i=0;i<this.listExamSubject.length;i++){
      if(this.listExamSubject[i].exam_month_yr==exam_month_yr 
         && this.listExamSubject[i].course_code==this.questionPaperForm.value.CourseCode){
            this.courseyearcode1.push(this.listExamSubject[i])
            const courseyearcode = this.courseyearcode1.map(({ course_year_code }) => course_year_code);
            this.courseyearcode = this.courseyearcode1.filter(({ course_year_code }, index) =>
               !courseyearcode.includes(course_year_code, index + 1));
               
            }
  }
  
  }

  selectedCourseYr(courseYr){
this.groupCode1=[]
    this.CourseGroupCode=[]
    if (this.isEmptyObject(this.pageParams)){
    this.questionPaperForm.get('CourseGroupCode').setValue('')
    }
    for(let i=0;i<this.listExamSubject.length;i++){
      if(this.listExamSubject[i].course_year_code==courseYr 
        && this.listExamSubject[i].course_code==this.questionPaperForm.value.CourseCode 
         && this.listExamSubject[i].exam_month_yr==this.questionPaperForm.value.ExamMonthYear){
            this.groupCode1.push(this.listExamSubject[i])
            const CourseGroupCode = this.groupCode1.map(({ group_code }) => group_code);
            this.CourseGroupCode = this.groupCode1.filter(({ group_code }, index) =>
               !CourseGroupCode.includes(group_code, index + 1))
            }
        }
    }

  selectedgroupCode(groupCode){
    this.Regulationcode1=[]
    this.RegulationCode=[]
    if (this.isEmptyObject(this.pageParams)){
    this.questionPaperForm.get('RegulationCode').setValue('')
    }
    for(let i=0;i<this.listExamSubject.length;i++){
      if(this.listExamSubject[i].group_code==groupCode 
        && this.listExamSubject[i].course_code==this.questionPaperForm.value.CourseCode 
        && this.listExamSubject[i].exam_month_yr==this.questionPaperForm.value.ExamMonthYear
        && this.listExamSubject[i].course_year_code==this.questionPaperForm.value.CourseYear ){
            this.Regulationcode1.push(this.listExamSubject[i])
            const RegulationCode = this.Regulationcode1.map(({ regulation_code }) => regulation_code);
            this.RegulationCode = this.Regulationcode1.filter(({ regulation_code }, index) =>
               !RegulationCode.includes(regulation_code, index + 1));
}
  }
  }
  selectedregulationCode(Regulationcode){   
    this.examdate1=[]
    this.ExamDate=[]
    if (this.isEmptyObject(this.pageParams)){
    this.questionPaperForm.get('ExamDate').setValue('')
    }
    for(let i=0;i<this.listExamSubject.length;i++){
      if(this.listExamSubject[i].regulation_code==Regulationcode 
        && this.listExamSubject[i].course_code==this.questionPaperForm.value.CourseCode 
        && this.listExamSubject[i].exam_month_yr==this.questionPaperForm.value.ExamMonthYear
        && this.listExamSubject[i].course_year_code==this.questionPaperForm.value.CourseYear
        && this.listExamSubject[i].group_code==this.questionPaperForm.value.CourseGroupCode ){
        this.examdate1.push(this.listExamSubject[i])
        const ExamDate = this.examdate1.map(({ exam_dates }) => exam_dates);
        this.ExamDate = this.examdate1.filter(({ exam_dates }, index) =>
           !ExamDate.includes(exam_dates, index + 1));
           this.ExamDate=this.ExamDate.sort((c, d) => new Date(c.exam_dates).getTime() - new Date(d.exam_dates).getTime());

}
}
  }
  selectedDate(examDate){   
    this.subjectcode1 = []
    this.subjectcode=[]
    if (this.isEmptyObject(this.pageParams)){
    this.questionPaperForm.get('subjectcode').setValue('')
    }
    for(let i=0;i<this.listExamSubject.length;i++){
      if(this.listExamSubject[i].exam_dates==examDate 
        && this.listExamSubject[i].course_code==this.questionPaperForm.value.CourseCode 
        && this.listExamSubject[i].exam_month_yr==this.questionPaperForm.value.ExamMonthYear
        && this.listExamSubject[i].course_year_code==this.questionPaperForm.value.CourseYear
        && this.listExamSubject[i].group_code==this.questionPaperForm.value.CourseGroupCode
        && this.listExamSubject[i].regulation_code==this.questionPaperForm.value.RegulationCode
         ){
        this.subjectcode1.push(this.listExamSubject[i])
        const subjectcode = this.subjectcode1.map(({ subject_code }) => subject_code);
        this.subjectcode = this.subjectcode1.filter(({ subject_code }, index) =>
           !subjectcode.includes(subject_code, index + 1));
}
}
}

selectedSubject(subjectcode){
  this.subjectName = '';
  if (this.subjectcode.filter(x => (x.subject_code === subjectcode)).length > 0){
      this.subjectName = this.subjectcode.filter(x => (x.subject_code === subjectcode))[0].subject_name;
  }
  if(!this.isEmptyObject(this.pageParams)) {
  }
}
manageQuestions(item): void{
  this.router.navigate(['admin-examination-management/admin-pre-examinations/create-question-paper/manage-questions'] , 
  { 
    queryParams: { 
      questionpaper_title: item.questionpaper_title,
       questionPaperId: item.pk_exam_questionpaper_id,
       CourseCode: this.questionPaperForm.value.CourseCode,
       ExamMonthYear: this.questionPaperForm.value.ExamMonthYear,
       CourseYear: this.questionPaperForm.value.CourseYear,
       subjectcode: this.questionPaperForm.value.subjectcode,
       RegulationCode: this.questionPaperForm.value.RegulationCode,
       ExamDate: this.questionPaperForm.value.ExamDate,
       CourseGroupCode: this.questionPaperForm.value.CourseGroupCode,
       subjectName: this.subjectName
    } 
}
  );
}

}
