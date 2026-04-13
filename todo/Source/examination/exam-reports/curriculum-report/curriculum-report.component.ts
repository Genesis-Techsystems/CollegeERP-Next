import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { GlobalService } from 'app/main/services/global.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatTableDataSource } from '@angular/material/table';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';

@Component({
  selector: 'app-curriculum-report',
  templateUrl: './curriculum-report.component.html',
  styleUrls: ['./curriculum-report.component.scss']
})
export class CurriculumReportComponent implements OnInit {

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('excelTable', { static: false }) excelTable: ElementRef;
  searchText='' 
  staffForm: FormGroup;

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private collegewisedetailsUrl = CONSTANTS.collegewisedetailsUrl;
  private curriculumReportUrl = CONSTANTS.curriculumReportUrl;

  dashboard : any
  filtersDetailsList=[];
  curriculumList=[];
  CollegesListDetails=[];
  displayedColumns: string[] = [];
dynamicColumns: string[] = [];
dataSource: MatTableDataSource<any>;
  colleges=[];
  examsList=[];
  searchExams=[];
  filteredExams :any ;
  examData=[];
  examsLists=[];
  panelOpenState = true;
  step = 0;  
  trafoItem=" curriculum Report";
  collegeCode: any;
  exam: any;
  columns: string[] = [];
  dataDetails;
  courses = [];
  courseListData = [];
  courseGroups = [];
  courseYears = [];
  groupList=[];
  courseYearsList=[];
  isAdmin = false;
  courseGroup;
  courseCode;
  courseYear;
  collegeName;
  collegeLogo = [];
  orgCode = '';
  Logo:any;
  
  regulationData = [];
  regulations = [];


  constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, private _globalService: GlobalService,
    private dialog: MatDialog, private genericFunctions: GenericFunctions) {
      this.dashboard = CONSTANTS.dashboard;
      this.orgCode = localStorage.getItem('orgCode');
}

  ngOnInit(): void {
    this.staffForm = this.formBuilder.group({
      collegeId: ['', Validators.required],
      courseId: ['', Validators.required],
      courseGroupId: [],
      courseYearId: [],
      regulationId: []
    }); 
    this.dataSource = new MatTableDataSource<any>(this.curriculumList);
     this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
    this.getFiltersList();
    this.isAdmin = JSON.parse(localStorage.getItem('isAdmin'));

  }
  getFiltersList(): void {
    this.spinner.show();
    let request = [
      {paramName: 'in_flag', paramValue: 'clg_filters'},
      {paramName: 'in_org_id', paramValue: +localStorage.getItem('organizationId')},
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
      {paramName: 'in_subject', paramValue: ''},
      {paramName: 'in_employee', paramValue: ''},
      {paramName: 'in_gm_codes', paramValue: ''},
    ];
    this.crudService.getDetailsByRequest(this.collegewisedetailsUrl, '', request, '&')
  .subscribe(result =>  {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.filtersDetailsList = result.data.result;
              for(let i=0; i<this.filtersDetailsList.length; i++){
                if(this.filtersDetailsList[i].length>0 && this.filtersDetailsList[i][0].flag === 'clg_filters'){
                  this.CollegesListDetails  = this.filtersDetailsList[i];
                  }else if(this.filtersDetailsList[i].length>0 && this.filtersDetailsList[i][0].clg_filters_regulation === 'clg_filters_regulation'){
                  this.regulationData = this.filtersDetailsList[i];
                }
          }
          const CollegeIdData = this.CollegesListDetails.map(({ fk_college_id }) => fk_college_id);
          this.colleges = this.CollegesListDetails.filter(({ fk_college_id }, index) => 
          !CollegeIdData.includes(fk_college_id, index + 1));
          if (this.colleges.length > 0){
            this.colleges = this.colleges.sort((a,b)=>a.clg_sort_order-b.clg_sort_order);
            this.staffForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
            this.selectedCollege(this.staffForm.value.collegeId); 
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
    this.staffForm.get('courseId').setValue('');
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('regulationId').setValue('');
    this.courses = [];
    this.courseGroups = [];
    this.courseYears = [];
    this.regulations = [];
    this.searchExams = [];
    this.courseListData=[]; 
   this.curriculumList = [];
   this.dataSource = new MatTableDataSource<any>([]);
 /*----------- COURSES -----------*/
this.courseListData=this.CollegesListDetails.filter(x=>(x.fk_college_id==collegeId))
if(this.courseListData.length>0){
const courseList = this.courseListData.map(({ fk_course_id }) => fk_course_id);
this.courses = this.courseListData.filter(({ fk_course_id }, index) =>
!courseList.includes(fk_course_id, index + 1));
}
if (this.courses.length > 0){
 this.staffForm.get('courseId').setValue(this.courses[0].fk_course_id);
 this.selectedCourse(this.staffForm.value.courseId); 
}     
 }
  selectedCourse(courseId): void{
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('regulationId').setValue('');
    this.courseGroups = [];
    this.courseYears = [];
    this.groupList=[];
    this.regulations = [];
   this.curriculumList = [];

    this.groupList=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.staffForm.value.collegeId && x.fk_course_id==this.staffForm.value.courseId))
   if(this.groupList.length>0){
   const groupList = this.groupList.map(({ fk_course_group_id }) => fk_course_group_id);
   this.courseGroups = this.groupList.filter(({ fk_course_group_id }, index) => !groupList.includes(fk_course_group_id, index + 1));
   }
   if (this.courseGroups.length > 0){
    this.staffForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
     this.selectedGroup(this.staffForm.value.courseGroupId); 
 }
  }

  applyFilter(filterValue: string) {

  if (!this.dataSource) return;

  this.dataSource.filter = filterValue.trim().toLowerCase();

  if (this.dataSource.paginator) {
    this.dataSource.paginator.firstPage();
  }

}
 
selectedGroup(courseGroupId): void {

  this.staffForm.get('courseYearId').setValue('');
  this.staffForm.get('regulationId').setValue('');

  this.courseYears = [];
  this.courseYearsList = [];
  this.regulations = [];
  this.curriculumList = [];

  /*----------- COURSE YEARS -----------*/

  if (courseGroupId == 0) {

    // When ALL groups selected → ignore group filter
    this.courseYearsList = this.CollegesListDetails.filter(
      x => (x.fk_college_id == this.staffForm.value.collegeId &&
            x.fk_course_id == this.staffForm.value.courseId)
    );

  } else {

    // Normal filtering when specific group selected
    this.courseYearsList = this.CollegesListDetails.filter(
      x => (x.fk_college_id == this.staffForm.value.collegeId &&
            x.fk_course_id == this.staffForm.value.courseId &&
            x.fk_course_group_id == courseGroupId)
    );

  }

  if (this.courseYearsList.length > 0) {
    const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);

    this.courseYears = this.courseYearsList.filter(
      ({ fk_course_year_id }, index) =>
      !courseYearsList.includes(fk_course_year_id, index + 1)
    );
  }

  if (this.courseYears.length > 0) {
    this.staffForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
    this.selectedYear(this.staffForm.value.courseYearId);
  }
}
   selectedYear(courseYearId){
     this.staffForm.get('regulationId').setValue('');
     this.regulations = [];
      this.curriculumList = [];
     if (this.staffForm.value.courseYearId != null && courseYearId != null){
       let universityId = this.CollegesListDetails.filter(x=>(x.fk_college_id == this.staffForm.value.collegeId))[0]?.fk_university_id;
       /*----------- REGULATIONS -----------*/   
       this.regulations = this.regulationData.filter(x=>(x.fk_university_id === universityId && x.fk_course_id === this.staffForm.value.courseId));
   }
   }
  reset(): void{
    this.staffForm.get('collegeId').setValue('');
    this.staffForm.get('courseId').setValue('');
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('regulationId').setValue('');
    this.curriculumList = [];
  }
  selectedData(){
    if (this.collegeCode){
      this.dataDetails = this.collegeCode;
    }
    if (this.courseCode){
      this.dataDetails = this.dataDetails + ' / ' + this.courseCode;
    }
    if (this.courseGroup){
      this.dataDetails = this.dataDetails + ' / ' + this.courseGroup;
    }
    if (this.courseYear){
      this.dataDetails = this.dataDetails + ' / ' + this.courseYear;
    }
   
  }
  getColleges(): void{
    this.collegeLogo =[];
    this.Logo = [];
    /*----------- COLLEGES -----------*/
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', 'isActive')
         .subscribe(result => {
             if (result.statusCode === 200){
                     if (result.data.resultList && result.data.resultList !== '') {
                         this.collegeLogo = result.data.resultList;  
                         this.Logo = this.collegeLogo.filter(x=> (x.collegeId == this.staffForm.value.collegeId))[0].logo
                         this.collegeName = this.collegeLogo.filter(x=> (x.collegeId == this.staffForm.value.collegeId))[0].collegeName
                        } else {
                         this.snotifyService.success(result.message, 'Success!');
                     }
                 }else{
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
  getDetails() {
    this.curriculumList=[];
    if(this.staffForm.valid){
      this.spinner.show();
      this.collegeCode = this.colleges.filter(x=>(x.fk_college_id == this.staffForm.value.collegeId))[0]?.college_code;
      this.collegeName = this.colleges.filter(x=>(x.fk_college_id == this.staffForm.value.collegeId))[0]?.college_name;
      this.courseCode = this.courses.filter(x=>(x.fk_course_id == this.staffForm.value.courseId))[0]?.course_code;
      this.exam = this.examsList.filter(x=>x.fk_exam_id==this.staffForm.value.examId)[0]?.exam_name;
      this.courseGroup = this.courseGroups.filter(x=>(x.fk_course_group_id == this.staffForm.value.courseGroupId))[0]?.group_code;
      this.courseYear = this.courseYears.filter(x=>(x.fk_course_year_id == this.staffForm.value.courseYearId))[0]?.course_year_name;
      this.selectedData();
      this.getColleges();
     let request = [
          {paramName:'in_flag', paramValue:'reg_univ_curriculum'},
          {paramName:'in_university_id', paramValue:0},
          {paramName:'in_college_id', paramValue:this.staffForm.value.collegeId},
          {paramName:'in_course_id', paramValue:this.staffForm.value.courseId},
          {paramName:'in_course_group_id', paramValue:this.staffForm.value.courseGroupId},
          {paramName:'in_course_year_id', paramValue:this.staffForm.value.courseYearId},
          {paramName:'in_regulation_id', paramValue:this.staffForm.value.regulationId},
          {paramName:'in_academic_year_id', paramValue:0},
          {paramName:'in_batch_id', paramValue:0}
          ];
      this.crudService.getDetailsByRequest(this.curriculumReportUrl, '', request, '&')
    .subscribe(result =>  {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '' && result.data.result.length > 0) {
                this.curriculumList = result.data.result[0];

if (this.curriculumList && this.curriculumList.length > 0) {

  this.dynamicColumns = Object.keys(this.curriculumList[0]);

  this.displayedColumns = ['sno', ...this.dynamicColumns];

  this.dataSource = new MatTableDataSource<any>(this.curriculumList);

  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;

}
                // this.snotifyService.success(result.message, 'Success!');
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
  }
  Print(){
    window.print();
  }
  exportAsExcel()
  {
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
