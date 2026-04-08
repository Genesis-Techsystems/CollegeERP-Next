import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import *  as moment from 'moment';

import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CONSTANTS } from 'app/main/common/constants';
import { Router, ActivatedRoute } from '@angular/router';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { ApplicationForm } from 'app/main/models/applicationForm';
import { GlobalService } from 'app/main/services/global.service';
import { ClickEventArgs } from '@syncfusion/ej2-navigations';
import { GridComponent, PdfExportProperties } from '@syncfusion/ej2-angular-grids';
import { ParametersService } from 'app/main/services/parameters.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-exam-answer-sheets-report',
  templateUrl: './exam-answer-sheets-report.component.html',
  styleUrls: ['./exam-answer-sheets-report.component.scss']
})
export class ExamAnswerSheetsReportComponent implements OnInit {

  
  feeFormGroup: FormGroup;

   displayedColumns: string[] = ['SNo', 'examdate', 'faculty', 'programme', 'branch', 'subject', 'registeredstudents','present','absent','scriptsExpected','scriptsUploaded','scriptsNotUploaded'];
  displayedValues: string[] = [];
  columns = [];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('excelTable', { static: false }) excelTable: ElementRef;
  trafoItem="Exam Answer Sheets Report"

  private getStdDetailsReport = CONSTANTS.getStdDetailsReport;
  private endURL = CONSTANTS.MAINAPI;
  private studentsReportsDownloadUrl = CONSTANTS.studentsReportsDownloadUrl;
  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl; 
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private getExamMasterDetailsUrl = CONSTANTS.getExamMasterDetailsUrl;
  private examTimetableUrl = CONSTANTS.examTimetableUrl;
  private isActive = CONSTANTS.isActive;

  collegeId = localStorage.getItem('collegeId');
  colleges: any[] = [];
  academicYears: any[] = [];
  courseGroups: any[] = [];
  courseYears: any[] = [];
  courses: any[] = [];
  studentsList: any[] = [];
  filtersDetailsList = [];
  filtersdata = [];
  academicyears = [];
  courseData = [];
  coursegroup = [];
  courseYearData = [];
 // quotas: GeneralDetail[] = [];
  collegeCode;
  step = 0;
  keys: any[] = [];
  empId;
  newstr: any[] = [];
  panelOpenState = true;
  pageParams: any = {};
  empSecurity = [];
  dataSecStaff;
  dataSECPrincipal;
  data;


  public gridData: any[];
  public toolbar: string[];
  // tslint:disable-next-line: ban-types
  public pageSettings: Object;
  @ViewChild('grid')
  public grid: GridComponent;
  // tslint:disable-next-line: ban-types
  public initialPage: Object;
  dataDetails = ' ';
  dataSecurity;
    collegeList: any;
    Logo: any;
    collegeName: any;
    private getCollegeExamDetails = CONSTANTS.getCollegeExamDetails;
  private getAnswerPaperUploadUrl=CONSTANTS.getAnswerPaperUploadUrl

  filtersData: any;
  filterExam: any[];
  examList=[];
  // date=new Date()
  filtersDataList: any[];
  dateConvert: any;
  summaryDetailsList=[];
  collegecode: any;
  examName: string;
  orgCode: string;
  backbutton: boolean;
  CollegesListDetails: any;
  academicYearsList: any;
  examsLists: any;
  examsList: any[];
  examData: any[];
  collegeLists: any[];
  CollegesListFilterDetails: any[];
  courseYearsList: any[];
  regulationFilterList: any[];
  examTimetables = [];

  constructor(private route: ActivatedRoute, private router: Router, private formBuilder: FormBuilder, private dialog: MatDialog, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions,private parameterservice:ParametersService,private location:Location,
              private _globalService: GlobalService) {
              this.dataSecStaff = this.genericFunctions.dataSecurityLevel();
              this.dataSecurity = this.genericFunctions.dataSecurity();
              this.dataSECPrincipal = this.genericFunctions.dataSecurityLevelPrincipal();
              if(this.parameterservice.back){
                this.backbutton=true
              }
              else{
                this.backbutton=false
              }
  }

   // tslint:disable-next-line:typedef
   ngOnInit() {
    this.orgCode=localStorage.getItem('orgCode')
    this.feeFormGroup = this.formBuilder.group({
      courseId:['',Validators.required],
      academicYearId:['',Validators.required],
      collegeId: [0],
      examId: [0],
      examTimetableId: ['',Validators.required],
      examDate: [new Date()],
    });

    this.toolbar = ['ExcelExport','PdfExport','Search'];
    this.pageSettings = { pageSize: 10 };
    this.initialPage = { pageSizes: true, pageCount: 10 };
    
    this.pageParams.path = 'report-catalyst';
    this.route.queryParams.subscribe(params => {
        if (!this.isEmptyObject(params)){
          this.pageParams.path = params.path;
        }
    });
    this.getFiltersList();
    this.dataSource = new MatTableDataSource<ApplicationForm>(this.studentsList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
  getColleges(): void{
    /*----------- COLLEGES -----------*/
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', 'isActive')
         .subscribe(result => {
             if (result.statusCode === 200){
                     if (result.data.resultList && result.data.resultList !== '') {
                         this.collegeList = result.data.resultList;  
                        //  this.Logo = this.collegeList.filter(x=> (x.collegeId == this.feeFormGroup.value.collegeId))[0].logo
                        //  this.collegeName = this.collegeList.filter(x=> (x.collegeId == this.feeFormGroup.value.collegeId))[0].collegeName
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

   // tslint:disable-next-line:typedef
   isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  // goBack(): void{
  //   this.router.navigate([this.pageParams.path]);
  // } 
       getFiltersList(): void {
           this.filtersDetailsList = []
              this.CollegesListDetails = []
              this.colleges = []
              this.spinner.show()
              let request = [
                { paramName: 'in_flag', paramValue: 'univ_exam_filters' },
                { paramName: 'in_flag_type', paramValue: 'REGSUP' },
                { paramName: 'in_university_id', paramValue: 0 },
                { paramName: 'in_college_id', paramValue: 0 },
                { paramName: 'in_course_id', paramValue: 0 },
                { paramName: 'in_course_group_id', paramValue: 0 },
                { paramName: 'in_course_year_id', paramValue: 0 },
                { paramName: 'in_exam_id', paramValue: 0 },
                { paramName: 'in_academic_year_id', paramValue: 0 },
                { paramName: 'in_regulation_id', paramValue: 0 },
                { paramName: 'in_subject_id', paramValue: 0 },
                { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
                { paramName: 'in_loginuser_roleid', paramValue: 0 },
                { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
                { paramName: 'in_param1', paramValue: 0 },
                { paramName: 'in_param2', paramValue: 0 },
              ];
              this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
                .subscribe(result => {
                  this.spinner.hide();
                  if (result.statusCode === 200) {
                    if (result.data && result.data !== '' && result.data.result.length > 0) {
                      this.filtersDetailsList = result.data.result;
                      for (let i = 0; i < this.filtersDetailsList.length; i++) {
                        if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_filters') {
                          this.CollegesListFilterDetails = this.filtersDetailsList[i];
                        }
                      }
                      const Course_Id = this.CollegesListFilterDetails.map(({ fk_course_id }) => fk_course_id);
                      this.courses = this.CollegesListFilterDetails.filter(({ fk_course_id }, index) =>
                        !Course_Id.includes(fk_course_id, index + 1));
                      if (this.courses.length > 0) {
                        this.feeFormGroup.get('courseId').setValue(this.courses[0].fk_course_id);
                        this.selectedCourse(this.feeFormGroup.value.courseId)
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
          
            selectedCourse(courseId): void {
              if (courseId != null) {
                this.feeFormGroup.get('academicYearId').setValue('')
                this.feeFormGroup.get('examId').setValue('');
                this.feeFormGroup.get('collegeId').setValue('');
                this.feeFormGroup.get('examTimetableId').setValue('');
                this.examTimetables = [];
                this.summaryDetailsList = [];
                this.dataSource = new MatTableDataSource<any>([]);
                this.dataSource.paginator = this.paginator;
                this.dataSource.sort = this.sort;
                this.academicYears = []
                this.examsList = [];
                this.filtersDetailsList = []
                this.colleges = []
                this.courseGroups = []
                this.courseYearsList = []
                this.courseYears = []
                this.academicYearsList = []
                this.examTimetables = [];
                this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.feeFormGroup.value.courseId))
             
          
                if (this.academicYearsList.length > 0) {
                  const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
                  this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
                }
                if (this.academicYears.length > 0) {
                  this.feeFormGroup.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
                  this.selectedAcademicYear(this.feeFormGroup.value.academicYearId)
                }
          
              }
            }
          
          
          
          
            selectedAcademicYear(academicYearId): void {
              this.feeFormGroup.get('examId').setValue('');
              this.feeFormGroup.get('collegeId').setValue('');
              this.feeFormGroup.get('examTimetableId').setValue('');
              this.examsList = [];
              this.filtersDetailsList = []
              this.colleges = []
              this.courseGroups = []
              this.courseYearsList = []
              this.courseYears = []
              this.examTimetables = [];
               this.examTimetables = [];
              this.summaryDetailsList = [];
              this.dataSource = new MatTableDataSource<any>([]);
              this.dataSource.paginator = this.paginator;
              this.dataSource.sort = this.sort;
              if (academicYearId) {
                this.examsLists = []
                this.examData = []
                this.examsLists = this.CollegesListFilterDetails.filter(x => (x.fk_course_id === this.feeFormGroup.value.courseId && x.fk_academic_year_id == this.feeFormGroup.value.academicYearId))
                if (this.examsLists.length > 0) {
                  const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
                  this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
                  this.examData = this.examsList;
                }
                if (this.examsList.length > 0) {
                  this.feeFormGroup.get('examId').setValue(this.examsList[0].fk_exam_id);
                  this.selectedExam(this.feeFormGroup.value.examId);
                }
              }
          
            }
            selectedExam(examId){
              this.examTimetables = [];
              this.feeFormGroup.get('examTimetableId').setValue('');
              this.summaryDetailsList = [];
              this.dataSource = new MatTableDataSource<any>([]);
              this.dataSource.paginator = this.paginator;
              this.dataSource.sort = this.sort;
              /*----------- Timetables -----------*/
            this.crudService.listDetailsByTwoIds(this.examTimetableUrl, examId, 'true',
                                                   this.getExamMasterDetailsUrl, this.isActive)
                .subscribe(result => {
                    if (result.statusCode === 200) {
                        if (result.data.resultList && result.data.resultList !== '') {
                            this.examTimetables = result.data.resultList;
                            this.examTimetables=this.examTimetables.sort
                            ((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
                               } else {
                            this.snotifyService.success(result.message, 'Success!');
                        }
                    } else {
                        this.snotifyService.error(result.message, 'Error!');
                    }

                }, error => {
                    if (error.error.statusCode === 401) {
                        this.snotifyService.error(error.error.message, 'Error!');
                        this.genericFunctions.logOut(this.router.url);
                    } else {
                        this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                    }
                });
            }
            // selectedExam(examId): void {
            //   this.filtersDetailsList = []
            //   this.colleges = []
            //   this.courseGroups = []
            //   this.courseYearsList = []
            //   this.courseYears = []
           
            //   this.feeFormGroup.get('collegeId').setValue('');
            //   let request = [
            //     { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_regexamstd' },
            //     { paramName: 'in_flag_type', paramValue: 'ALL' },
            //     { paramName: 'in_university_id', paramValue: 0 },
            //     { paramName: 'in_college_id', paramValue: 0 },
            //     { paramName: 'in_course_id', paramValue: this.feeFormGroup.value.courseId },
            //     { paramName: 'in_course_group_id', paramValue: 0 },
            //     { paramName: 'in_course_year_id', paramValue: 0 },
            //     { paramName: 'in_exam_id', paramValue: this.feeFormGroup.value.examId },
            //     { paramName: 'in_academic_year_id', paramValue: this.feeFormGroup.value.academicYearId },
            //     { paramName: 'in_regulation_id', paramValue: 0 },
            //     { paramName: 'in_subject_id', paramValue: 0 },
            //     { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
            //     { paramName: 'in_loginuser_roleid', paramValue: 0 },
            //     { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
            //     { paramName: 'in_param1', paramValue: 0 },
            //     { paramName: 'in_param2', paramValue: 0 },
            //   ];
            //   this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
            //     .subscribe(result => {
            //       this.spinner.hide();
            //       if (result.statusCode === 200) {
            //         if (result.data && result.data !== '' && result.data.result.length > 0) {
            //           this.filtersDetailsList = result.data.result;
            //           for (let i = 0; i < this.filtersDetailsList.length; i++) {
            //             if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_rest_filters') {
            //               this.CollegesListDetails = this.filtersDetailsList[i];
            //             }
            //             else if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'regulations') {
            //               console.log(this.filtersDetailsList[i]);
          
            //               this.regulationFilterList = this.filtersDetailsList[i];
            //             }
          
            //           }
          
            //           if (this.CollegesListDetails) {
            //             /*----------- Colleges -----------*/
            //             this.colleges = []
            //             this.courseGroups = []
            //             this.courseYearsList = []
            //             this.courseYears = []
            //             this.colleges = this.CollegesListDetails
            //             const CollegeIdData = this.colleges.map(({ fk_college_id }) => fk_college_id);
            //             this.colleges = this.colleges.filter(({ fk_college_id }, index) => !CollegeIdData.includes(fk_college_id, index + 1));
            //             if (this.colleges.length > 0) {
            //               this.feeFormGroup.get('collegeId').setValue(this.colleges[0].fk_college_id);
            //               this.selectedCollege(this.feeFormGroup.value.collegeId);
            //             }
            //             //     /*----------- COURSES Years -----------*/      
          
          
            //           }
          
          
            //         } else {
            //           this.snotifyService.success(result.message, 'Success!');
            //         }
            //       } else {
            //         this.snotifyService.error(result.message, 'Error!');
            //       }
            //     }, error => {
            //       this.spinner.hide();
            //       if (error.error.statusCode === 401) {
            //         this.snotifyService.error(error.error.message, 'Error!');
            //         this.genericFunctions.logOut(this.router.url);
            //       } else {
            //         this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
            //       }
            //     });
          
          
            // }
   
  
  selectedCollege(collegeId){
    this.summaryDetailsList = [];
    this.dataSource = new MatTableDataSource<any>([]);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
  selectedExamTimetable(examTimetableId){
    this.summaryDetailsList = [];
    this.dataSource = new MatTableDataSource<any>([]);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
  getList(){
    // if(this.feeFormGroup.value.collegeId!=0){
    //   this.collegeName=this.colleges.filter(x=>(x.fk_college_id==this.feeFormGroup.value.collegeId))[0].college_name
    // }
    // else{
    //   this.collegeName=''
    // }
    if(this.feeFormGroup.value.examId !=0 ){
      this.examName=this.examsList.filter(x=>(x.fk_exam_id==this.feeFormGroup.value.examId))[0].exam_name;
    }
    else{
      this.examName=''
    }
      let date = '';
    if(this.feeFormGroup.value.examTimetableId === 0){
      date = '1991-01-01';
    }else{
      date = this.examTimetables.filter(x => (x.examTimetableId === this.feeFormGroup.value.examTimetableId))[0]?.examDate;
    }
    // this.getColleges();
    // this.dateConvert = this.genericFunctions.momentFormatYMD1(date);
      this.spinner.show();
      this.summaryDetailsList = [];
      let request = [
        {paramName: 'in_flag', paramValue: 'exam_timetable_answerpaper_details'},
        {paramName: 'in_org_id', paramValue: +localStorage.getItem('organizationId')},
        {paramName: 'in_college_id', paramValue: 0},
        {paramName: 'in_academic_year_id', paramValue: 0},
        {paramName: 'in_isadmin', paramValue: 0},
        {paramName: 'in_exam_id', paramValue: this.feeFormGroup.value.examId},
        {paramName: 'in_timetable_id', paramValue: this.feeFormGroup.value.examTimetableId},
        {paramName: 'in_exam_date', paramValue:date },
        { paramName: 'in_subject_id', paramValue:0},
        {paramName: 'in_loginuser_empid', paramValue: 0},
        {paramName: 'in_loginuser_roleid', paramValue: 0}
      ];
      this.crudService.getDetailsByRequest(this.getAnswerPaperUploadUrl, '', request, '&')
    .subscribe(result =>  {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '' && result.data.result.length > 0) {
                this.summaryDetailsList = result.data.result[2];
                this.dataSource = new MatTableDataSource<any>(this.summaryDetailsList);
                this.dataSource.paginator = this.paginator;
                this.dataSource.sort = this.sort
                // this.notUploadAnswerPaper=this.summaryDetailsList[0]?.presented_Students - this.summaryDetailsList[0]?.no_oof_answerpaper_uploaded
                // this.dataSource1 = new MatTableDataSource(this.summaryDetailsList);
                // setTimeout(()=>this.dataSource1.paginator = this.paginator1);
                // this.dataSource1.sort = this.sort;
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
  // calDays(): void {
  //   this.flag = false;
 
  //   this.examDate = this.genericFunctions.momentWithDateFormatYMD(this.scanPapersForm.value.examDate); // new Date(this.data.issueTodate);
  //             /*..............DISTINCT SUBJECT......... */
   
  // }

  searchexam(value) {
    this.examData = [];
    this.search(value)
  }

  search(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examsList.length; i++) {
      let option = this.examsList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
        this.examData.push(option);
      }
    }
  }

  dataRefresh(): void{
    this.studentsList = [];
    this.dataSource = new MatTableDataSource<ApplicationForm>(this.studentsList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
      this.dataSource.filter = filterValue.trim().toLowerCase();

      if (this.dataSource.paginator) {
          this.dataSource.paginator.firstPage();
      }
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
      PrintData(){
       window.print()
     }
     goBack(){
      this.location.back()
    }
}