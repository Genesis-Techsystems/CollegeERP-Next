import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { Subject, ReplaySubject } from 'rxjs';

@Component({
  selector: 'app-exam-evaluation-summary-report',
  templateUrl: './exam-evaluation-summary-report.component.html',
  styleUrls: ['./exam-evaluation-summary-report.component.scss']
})
export class ExamEvaluationSummaryReportComponent implements OnInit {

  private collegewisedetailsUrl=CONSTANTS.collegewisedetailsUrl;
  private getExamEvaluationCodesUrl = CONSTANTS.getExamEvaluationCodesUrl;
  private getEvaluationSummaryUrl = CONSTANTS.getEvaluationSummaryUrl;
  private organizationsCrudUrl = CONSTANTS.organizationsCrudUrl;
  private isActive = CONSTANTS.isActive;

  reportForm:FormGroup;

  @ViewChild('excelTable', { static: false }) excelTable: ElementRef;
  trafoItem="Exam Evaluation Summary Report"; 
  details = '';

  summaryList: any[] = [];
  noOfSelectedSteps: any[] = [];
  currentPosition = 'intial_stage';
  filtersdata = [];
  filtersDetailsList = [];
  courses = [];
  currentYear = [];
  academicYears = [];
  organizationDetails = [];
  Logo : any;
  orgCode = '';
  CollegesListDetails = [];
  colleges = [];
  academicYearData = [];
  examsLists = [];
  examData = [];
  examsList = [];
  subjectCourseYears = [];
  courseGroups = [];
  courseYears = [];
  searchExams = [];
  courseListData = [];
  academicYearsList = [];
  courseCode;

  public examFilterCtrl: FormControl = new FormControl();
  public filteredExams: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  constructor(private snotifyService: SnotifyService, private router: Router,private formBuilder:FormBuilder,
    private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions) {

  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.reportForm = this.formBuilder.group({
      collegeId:[],
      courseId:[''],
      academicYearId:[''],
      examId:[''],
    });
    this.getFiltersList();
  }

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  getOrganizations(): void{
  this.organizationDetails = [];
    let orgId = +localStorage.getItem('organizationId');
    this.spinner.show();
    /*----------- ORGANIZATIONS -----------*/
    this.crudService.listDetailsById(this.organizationsCrudUrl, 'true', this.isActive)
    .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
            if (result.data.resultList && result.data.resultList !== '') {
                this.organizationDetails = result.data.resultList;
                this.Logo = this.organizationDetails.filter(x=>(x.organizationId === orgId))[0]?.logoPath;
                this.orgCode = this.organizationDetails.filter(x=>(x.organizationId === orgId))[0]?.orgName;
                // this.snotifyService.success(result.message, 'Success!');
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
  getFiltersList(): void {
    this.filtersDetailsList=[]
    this.CollegesListDetails=[]
    this.colleges=[]
    this.spinner.show();
    let request = [
      {paramName: 'in_flag', paramValue: 'clg_exam_timetable_filters'},
      {paramName: 'in_org_id', paramValue:+localStorage.getItem('organizationId')},
      {paramName: 'in_college_id', paramValue: 0},
      {paramName: 'in_course_id', paramValue: 0},
      {paramName: 'in_course_group_id', paramValue: 0},
      {paramName: 'in_course_year_id', paramValue: 0},
      {paramName: 'in_group_section_id', paramValue: 0},
      {paramName: 'in_academic_year_id', paramValue: 0},
      {paramName: 'in_dept_id', paramValue: 0},
       {paramName: 'in_isadmin', paramValue: 0},
        {paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId')},
         {paramName: 'in_loginuser_roleid', paramValue: 0},
         {paramName: 'in_employee', paramValue: ''},
         {paramName: 'in_subject', paramValue: ''},
         {paramName: 'in_gm_codes', paramValue:''},
        
         
    ];
    this.crudService.getDetailsByRequest(this.collegewisedetailsUrl, '', request, '&')
  .subscribe(result =>  {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.filtersDetailsList = result.data.result;
              for(let i=0; i<this.filtersDetailsList.length; i++){
                if(this.filtersDetailsList[i].length>0 && this.filtersDetailsList[i][0].flag === 'clg_exam_timetable_filters'){
                  this.CollegesListDetails  = this.filtersDetailsList[i];
                  }
          }
          const CollegeIdData = this.CollegesListDetails.map(({ fk_college_id }) => fk_college_id);
          this.colleges = this.CollegesListDetails.filter(({ fk_college_id }, index) => 
          !CollegeIdData.includes(fk_college_id, index + 1));
          if (this.colleges.length > 0){
            this.colleges = this.colleges.sort((a,b)=>a.clg_sort_order-b.clg_sort_order);
            this.reportForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
            this.selectedCollege(this.reportForm.value.collegeId); 
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
            this.genericFunctions.logOut(this.router.url);
          } else {
            this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          }
        });
  }
  selectedCollege(collegeId): void{
      this.reportForm.get('courseId').setValue('');
      this.reportForm.get('academicYearId').setValue(0);
      this.subjectCourseYears = [];
      this.courses = [];
      this.courseGroups = [];
      this.courseYears = [];
      this.searchExams = [];
      this.searchExams.push({examName: 'Search by Exam name.'});
      this.filteredExams.next(this.searchExams.slice());
      this.courseListData=[]
      this.courseListData=this.CollegesListDetails.filter(x=>(x.fk_college_id==collegeId))
              if(this.courseListData.length>0){
                  const courseList = this.courseListData.map(({ fk_course_id }) => fk_course_id);
                  this.courses = this.courseListData.filter(({ fk_course_id }, index) =>
                  !courseList.includes(fk_course_id, index + 1));
              }
              if (this.courses.length > 0){
                this.reportForm.get('courseId').setValue(this.courses[0].fk_course_id);
                this.selectedCourse(this.reportForm.value.courseId); 
             } 
  }

  selectedCourse(courseId): void{
      this.courseGroups = [];
      this.courseYears = [];
      this.reportForm.get('academicYearId').setValue(0);
      this.subjectCourseYears = [];
      this.searchExams = [];
      this.searchExams.push({examName: 'Search by Exam name.'});
      this.filteredExams.next(this.searchExams.slice());
      this.courseCode = this.courses.filter(x=>(x.fk_course_id === courseId))[0]?.course_code;
      this.academicYearsList=[]
      this.academicYearsList=this.CollegesListDetails.filter(x=>(x.fk_college_id==this.reportForm.value.collegeId && x.fk_course_id==this.reportForm.value.courseId))
            if(this.academicYearsList.length>0){
            const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
            this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
            this.academicYears = this.academicYears.sort((a,b)=>parseInt(b.academic_year)-parseInt(a.academic_year))

            }
    
    if(this.academicYears.length>0){
      this.reportForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
      this.selectedAcademicYear( this.reportForm.value.academicYearId)
    }		 
  }

  // tslint:disable-next-line:typedef
selectedAcademicYear(academicYearId){
  this.reportForm.get('examId').setValue(0);
  this.examsList = [];
  this.searchExams = [];
  this.subjectCourseYears = [];
  this.searchExams.push({examName: 'Search by Exam name.'});
  this.filteredExams.next(this.searchExams.slice());
  // this.preStaggings = [];
  // this.academicYear = this.academicYears.filter(x => (x.academicYearId === academicYearId))[0].academicYear;
  // tslint:disable-next-line:max-line-length
  this.examData = []
  this.examsList = []
  this.examsLists=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.reportForm.value.collegeId && x.fk_course_id==this.reportForm.value.courseId && x.fk_academic_year_id==academicYearId))
if(this.examsLists.length>0){
  const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
  this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
  this.examsList  = this.examsList.filter(x=>!x.is_internal_exam)
  this.examData = this.examsList;
}
if(this.examsList.length>0){
  this.reportForm.get('examId').setValue(this.examsList[0].fk_exam_id);
  this.selectedExam(this.reportForm.value.examId)
}
}
searchExam(value) {
  this.examData = [];
  this.examSearch(value);
}
examSearch(value: string) {
  let filter = value.toLowerCase()
  for (let i = 0; i < this.examsList.length; i++) {
      let option = this.examsList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
          this.examData.push(option);
      }
  }
}
  
selectedExam(examId){
  this.getSummary('sub_serial_number', this.courseCode,this.reportForm.value.examId,'',0, 'SubjectCode', 'in_subject_code')
}
  getSummary(in_flag,in_course_code,in_subject_code,fk_exam_id,evaluator_profile_id, detailName, detailValue): void {
    this.summaryList = [];
    this.spinner.show();
    this.crudService.listByFiveIds(this.getEvaluationSummaryUrl, in_flag,
      'M. Tech', 4,in_subject_code,evaluator_profile_id, 'in_flag', 'in_course_code', 'in_exam_id','in_subject_code','in_evaluator_profile_id')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.success) {
            this.summaryList = result.data.result[0];
            if (in_flag === 'sub_eval_assign_count'){
              this.summaryList.map(x => {
                x.varaiableName = detailName,
                x.varaiableValue = x[detailValue] + ' (' + x.subject_code + ')'
              })
            }else{
              this.summaryList.map(x => {
                x.varaiableName = detailName,
                x.varaiableValue = x[detailValue]
              })
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
          this.genericFunctions.logOut(this.router.url);
        } else {
          this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        }
      });
  }

  task(e, in_flag, in_course_code, in_subject_code, fk_exam_id,evaluator_profile_id, detailName, detailValue, back) {
     this.getSummary(in_flag, in_course_code, in_subject_code, fk_exam_id,evaluator_profile_id, detailName, detailValue);
    if (back === 'add') {
      this.noOfSelectedSteps.push({
        id: this.noOfSelectedSteps.length + 1,
        name: e,
        in_flag: in_flag,
        in_course_code: in_course_code,
        in_subject_code: in_subject_code,
        fk_exam_id: fk_exam_id,
        evaluator_profile_id: evaluator_profile_id,
        detailName: detailName,
        detailValue: detailValue
      });
    }
    this.currentPosition = detailValue;
  }

  back() {
    this.noOfSelectedSteps.pop();
    if (this.noOfSelectedSteps.length > 0) {
      let lastObj = this.noOfSelectedSteps[this.noOfSelectedSteps.length - 1];
      this.task(lastObj.name, lastObj.in_flag, lastObj.in_course_code, lastObj.in_subject_code, lastObj.fk_exam_id,lastObj.evaluator_profile_id, lastObj.detailName, lastObj.detailValue, 'back');
    } else {
      // this.getSummary('std_details_college', 0, this.reportForm.value.academicYearId, 0, 0, 0, +localStorage.getItem('employeeId'), 0, 'College', 'college_code');
      this.getSummary('sub_serial_number', this.courseCode,this.reportForm.value.examId,'',0, 'SubjectCode', 'in_subject_code')
      this.currentPosition = 'intial_stage';
    }
  }
  Print(){
    window.print();
  }
  exportAsExcel() {
    const uri = 'data:application/vnd.ms-excel;base64,';
    const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>`;
    const base64 = function(s) { return window.btoa(unescape(encodeURIComponent(s))) };
    const format = function(s, c) { return s.replace(/{(\w+)}/g, function(m, p) { return c[p]; }) };
  
    const table = this.excelTable.nativeElement;
    const ctx = { worksheet: 'Worksheet', table: table.innerHTML };
  
    const link = document.createElement('a');
    link.download = `${this.trafoItem}.xls`;
    link.href = uri + base64(format(template, ctx));
    link.click();
  }
}
