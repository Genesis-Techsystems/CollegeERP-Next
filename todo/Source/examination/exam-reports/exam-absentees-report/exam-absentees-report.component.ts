import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { ExamMaster } from 'app/main/models/examMaster';
import { CrudService } from 'app/main/services/crud.service';
import { ParametersService } from 'app/main/services/parameters.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { ReplaySubject, Subject } from 'rxjs';
import { Location } from '@angular/common';

@Component({
  selector: 'app-exam-absentees-report',
  templateUrl: './exam-absentees-report.component.html',
  styleUrls: ['./exam-absentees-report.component.scss']
})
export class ExamAbsenteesReportComponent implements OnInit {

   displayedColumns: string[] = ['id','collegeCode','groupCode','courseYearCode','examDate','subject','hallticketNumber'];
   dataSource: MatTableDataSource<any>;
 
   @ViewChild(MatPaginator) paginator: MatPaginator;
   @ViewChild(MatSort) sort: MatSort;
   @ViewChild('uploadXl') uploadXl: ElementRef;
   @ViewChild('excelTable', { static: false }) excelTable: ElementRef;

   private getExamAbsenteesUrl = CONSTANTS.getExamAbsenteesUrl;
   private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
   private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
   private isActive = CONSTANTS.isActive;

   trafoexternalItem="Exam Absentees report";

   selectedSubjects = []
   evaluatorsubjectform: FormGroup;
   step = 0;
   flag: boolean;
   evaluatorForm: FormGroup;
   subjectcode: any;
   collegeCode = [];

   examEvaluationList = [];
   data: any;
   examStudentList: any = [];
   examStudentList1: any = [];
   examStudentListdata: any[];
   orgCode;
   Logo;
   collegesLogoList = [];
   academicYears = [];
   examData = [];
   exams = [];
   examFilter = [];
   courseGroups = [];
   examsList: any;
   filtersDetailsList: any;
   subjectsDetailList: any;
   subjectsList: any;
   subjectData: any;
   CollegesListDetails: any;
   regulationFilterList: any;
   regulationList: any;
   courseYearsList: any;
   courseYears: any;
   courseGroupList: any;
   colleges: any;
   CollegesListFilterDetails: any;
   examsLists: any[];
   academicYearsList: any;
   courses: any;
   exam: any;
 
   constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
     private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
     private genericFunctions: GenericFunctions, private location:Location) {
        this.orgCode = localStorage.getItem('orgCode');
   }
   ngOnInit(): void {
     this.evaluatorForm = this.formBuilder.group({
       courseId: ['', Validators.required],
       academicYearId: ['', Validators.required],
       examId: ['', Validators.required],
       courseGroupId:['',Validators.required],
       courseYearId:['',Validators.required],
       subjectId: ['', Validators.required],
       collegeId: ['', Validators.required],
       regulationId: ['', Validators.required],
 
     })
     this.evaluatorsubjectform = this.formBuilder.group({
       in_orgid: 1,
       in_fdate: ['1990-01-01'],
       in_tdate: ['1990-01-01'],
       in_exam_month_yr: [''],
       in_course_code: [''],
       in_course_year_code: [''],
       in_subject_code: [''],
       in_evalutor_profileid: 0,
       in_exam_date: '1990-01-01',
       in_regulation_code: ''
     })
     this.getFiltersList();
     this.getCollegeLogo();
     this.dataSource = new MatTableDataSource<any>(this.examEvaluationList);
     this.dataSource.paginator = this.paginator;
     this.dataSource.sort = this.sort;
   }
 
   applyFilter(filterValue) {
     this.dataSource.filter = filterValue.trim().toLowerCase();
 
     if (this.dataSource.paginator) {
       this.dataSource.paginator.firstPage();
     }
   }
   getCollegeLogo(): void {
     this.collegesLogoList = [];
     /*----------- COLLEGES -----------*/
     this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
       .subscribe(result => {
         if (result.statusCode === 200) {
           if (result.data.resultList && result.data.resultList !== '') {
             this.collegesLogoList = result.data.resultList;
             this.Logo = this.collegesLogoList[0].logo;
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
                  this.evaluatorForm.get('courseId').setValue(this.courses[0].fk_course_id);
                  this.selectedCourse(this.evaluatorForm.value.courseId)
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
          this.evaluatorForm.get('academicYearId').setValue('')
          this.evaluatorForm.get('examId').setValue('');
          this.evaluatorForm.get('collegeId').setValue('');
          this.evaluatorForm.get('courseGroupId').setValue('');
          this.evaluatorForm.get('courseYearId').setValue('');
          this.academicYears = []
          this.examsList = [];
          this.filtersDetailsList = []
          this.colleges = []
          this.courseGroups = []
          this.courseYearsList = []
          this.courseYears = []
          this.regulationList = []
          this.academicYearsList = []
          this.examStudentListdata = [];
          this.examEvaluationList = [];
          this.dataSource = new MatTableDataSource([]);
        if (courseId != null) {
          this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.evaluatorForm.value.courseId));
          if (this.academicYearsList.length > 0) {
            const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
            this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
          }
          if (this.academicYears.length > 0) {
            this.evaluatorForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
            this.selectedAcademicYear(this.evaluatorForm.value.academicYearId)
          }
        }
      }
    
      selectedAcademicYear(academicYearId): void {
        this.evaluatorForm.get('examId').setValue('');
        this.evaluatorForm.get('collegeId').setValue('');
        this.evaluatorForm.get('courseGroupId').setValue('');
        this.evaluatorForm.get('courseYearId').setValue('');
        this.examsLists = []
        this.examData = []
        this.examsList = [];
        this.filtersDetailsList = []
        this.colleges = []
        this.courseGroups = []
        this.courseYearsList = []
        this.courseYears = []
        this.regulationList = []
        this.examStudentListdata = [];
        this.examEvaluationList = [];
        this.dataSource = new MatTableDataSource([]);
        if (academicYearId) {
          this.examsLists = this.CollegesListFilterDetails.filter(x => (x.fk_course_id === this.evaluatorForm.value.courseId && x.fk_academic_year_id == this.evaluatorForm.value.academicYearId))
          if (this.examsLists.length > 0) {
            const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
            this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
            this.examData = this.examsList;
          }
          if (this.examsList.length > 0) {
            this.evaluatorForm.get('examId').setValue(this.examsList[0].fk_exam_id);
            this.selectedExam(this.evaluatorForm.value.examId);
          }
        }
      }
      selectedExam(examId): void {
        this.filtersDetailsList = []
        this.colleges = []
        this.courseGroups = []
        this.courseYearsList = []
        this.courseYears = []
        this.regulationList = []
        this.colleges = []
        this.courseGroups = []
        this.courseYearsList = []
        this.courseYears = []
        this.regulationList = []
        this.examStudentListdata = [];
        this.examEvaluationList = [];
        this.dataSource = new MatTableDataSource([]);
        this.evaluatorForm.get('collegeId').setValue('');
        this.evaluatorForm.get('courseGroupId').setValue('');
        this.evaluatorForm.get('courseYearId').setValue('');
        let request = [
          { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_regexamstd' },
          { paramName: 'in_flag_type', paramValue: 'ALL' },
          { paramName: 'in_university_id', paramValue: 0 },
          { paramName: 'in_college_id', paramValue: 0 },
          { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
          { paramName: 'in_course_group_id', paramValue: 0 },
          { paramName: 'in_course_year_id', paramValue: 0 },
          { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
          { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
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
                  if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_rest_filters') {
                    this.CollegesListDetails = this.filtersDetailsList[i];
                  }
                  else if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'regulations') {
                    this.regulationFilterList = this.filtersDetailsList[i];
                  }
                }
                if (this.CollegesListDetails) {
                  this.colleges = this.CollegesListDetails;
                  const CollegeIdData = this.colleges.map(({ fk_college_id }) => fk_college_id);
                  this.colleges = this.colleges.filter(({ fk_college_id }, index) => !CollegeIdData.includes(fk_college_id, index + 1));
                  if (this.colleges.length > 0) {
                    this.evaluatorForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                    this.selectedCollege(this.evaluatorForm.value.collegeId);
                  }
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
      selectedCollege(collegeId): void {
        this.collegeCode = this.colleges.filter(x => (x.fk_college_id === collegeId))[0].college_code;
        this.courseGroups = []
        this.courseYearsList = []
        this.courseYears = []
        this.regulationList = []
        this.courseGroupList = []
        this.courseGroups = []
        this.examStudentListdata = [];
        this.examEvaluationList = [];
        this.dataSource = new MatTableDataSource([]);
        this.evaluatorForm.get('courseGroupId').setValue('');
        this.evaluatorForm.get('courseYearId').setValue('');
        if (collegeId != null) {
          this.courseGroupList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.evaluatorForm.value.collegeId))
          if (this.courseGroupList.length > 0) {
            const courseGroups = this.courseGroupList.map(({ fk_course_group_id }) => fk_course_group_id);
            this.courseGroups = this.courseGroupList.filter(({ fk_course_group_id }, index) => !courseGroups.includes(fk_course_group_id, index + 1));
          }
          if (this.courseGroups.length > 0) {
            this.evaluatorForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
            this.selectedGroup(this.evaluatorForm.value.courseGroupId)
          }
        }
      }
    
      selectedGroup(courseGroupId): void {
        this.evaluatorForm.get('courseYearId').setValue('');
        this.courseYearsList = []
        this.courseYears = []
        this.regulationList = []
        this.examStudentListdata = [];
        this.examEvaluationList = [];
        this.dataSource = new MatTableDataSource([]);
        /*----------- COURSES Years -----------*/
        this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.evaluatorForm.value.collegeId && x.fk_course_group_id == courseGroupId))
        if (this.courseYearsList.length > 0) {
          const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
          this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
        }
        if (this.courseYears.length > 0) {
          this.evaluatorForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
          this.selectedYear(this.evaluatorForm.value.courseYearId);
        }
      }
 
 
    selectedYear(courseYearId){
     this.evaluatorForm.get('regulationId').setValue('');
     this.regulationList = [];
     this.examStudentListdata = [];
     this.examEvaluationList = [];
     this.dataSource = new MatTableDataSource([]);
     if (courseYearId) {
       this.regulationFilterList = this.CollegesListDetails.filter(x => (x.fk_course_id == this.evaluatorForm.value.courseId));
       if (this.regulationFilterList.length > 0) {
         const regulationDetailList = this.regulationFilterList.map(({ fk_regulation_id }) => fk_regulation_id);
         this.regulationList = this.regulationFilterList.filter(({ fk_regulation_id }, index) => !regulationDetailList.includes(fk_regulation_id, index + 1));
       }
       if (this.regulationList.length > 0) {
         this.evaluatorForm.get('regulationId').setValue(this.regulationList[0].fk_regulation_id);
         this.selectedRegulation(this.evaluatorForm.value.regulationId);
       }
     }
   }
 selectedRegulation(regulationId): void {
    this.evaluatorForm.get('subjectId').setValue('');
    this.subjectsDetailList = []
    this.subjectData = []
    this.subjectsList =[]
    this.examStudentListdata = [];
    this.examEvaluationList = [];
    this.dataSource = new MatTableDataSource([]);
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_subject_uc' },
      { paramName: 'in_flag_type', paramValue: 'ALL' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: this.evaluatorForm.value.collegeId },
      { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: this.evaluatorForm.value.courseGroupId },
      { paramName: 'in_course_year_id', paramValue: this.evaluatorForm.value.courseYearId },
      { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
      { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
      { paramName: 'in_regulation_id', paramValue:  this.evaluatorForm.value.regulationId },
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
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_sub_uc') {
                this.subjectsDetailList = this.filtersDetailsList[i];
              }
            }
            if (this.subjectsDetailList ) {
              if (this.subjectsDetailList.length > 0) {
                const subjectsDetailList = this.subjectsDetailList.map(({ fk_subject_id }) => fk_subject_id);
                this.subjectsList = this.subjectsDetailList.filter(({ fk_subject_id }, index) => !subjectsDetailList.includes(fk_subject_id, index + 1));
                this.subjectData = this.subjectsList;
              }
              if (this.subjectsList.length > 0) {
                this.evaluatorForm.get('subjectId').setValue(this.subjectsList[0].fk_subject_id);
              }
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
 selectedSubject(){
   this.examStudentListdata = [];
   this.examEvaluationList = [];
   this.dataSource = new MatTableDataSource([]);
 }

 searchexam(value) {
  this.examData = [];
  this.searchExam(value)
 }

 searchExam(value: string) {
  let filter = value.toLowerCase();
  for (let i = 0; i < this.examsList.length; i++) {
    let option = this.examsList[i];
    if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
      this.examData.push(option);
    }
  }
 }
 
 searchSubject(value) {
  this.subjectData = [];
  this.searchsubject(value)
 }

 searchsubject(value: string) {
  let filter = value.toLowerCase();
  for (let i = 0; i < this.subjectsDetailList.length; i++) {
    let option = this.subjectsDetailList[i];
    if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
      this.subjectData.push(option);
    } else
      if (option.subject_code.toLowerCase().indexOf(filter) >= 0) {
        this.subjectData.push(option);
      }
  }
 }
  
// Replace your existing getEvaluationList() with this
getEvaluationList() {
  this.spinner.show();
  this.examStudentListdata = [];
  this.examEvaluationList = [];
  this.dataSource = new MatTableDataSource([]);

  // quick form validation
  if (!this.evaluatorsubjectform?.valid) {
    this.spinner.hide();
    this.snotifyService.info('Please fill required filters', 'Validation');
    return;
  }
  // build request param array (same shape as your backend expects)
  const request = [
    { paramName: 'in_college_id', paramValue: this.evaluatorForm.value.collegeId },
    { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
    { paramName: 'in_course_group_id', paramValue: this.evaluatorForm.value.courseGroupId },
    { paramName: 'in_course_year_id', paramValue: this.evaluatorForm.value.courseYearId },
    { paramName: 'in_regulation_id', paramValue: this.evaluatorForm.value.regulationId },
    { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
    { paramName: 'in_exam_date', paramValue: '1990-01-01' },
    { paramName: 'in_subject_id', paramValue: this.evaluatorForm.value.subjectId }
  ];
  this.crudService.getDetailsByRequest(this.getExamAbsenteesUrl, '', request, '&')
    .subscribe({
      next: (result: any) => {
        // Always hide spinner eventually
        this.spinner.hide();
        this.exam = result.data.result[0][0]?.exam_label_name;
        const ok = result && (result.success === true || result.statusCode === 200);
        if (!ok) {
          // if server didn't signal success, bubble useful message
          const msg = result?.message || result?.error || 'Error fetching data';
          this.snotifyService.error(msg, 'Error!');
          return;
        }
        // Normalize backend data shapes into rows[]
        let rows: any[] = [];
        try {
          if (result.data == null) {
            rows = [];
          } else if (Array.isArray(result.data)) {
            rows = result.data;
          } else if (Array.isArray(result.data.result)) {
            // some backends return { data: { result: [ rowsArray ] } }
            const maybe = result.data.result[0];
            rows = Array.isArray(maybe) ? maybe : result.data.result;
          } else if (Array.isArray(result.data.rows)) {
            rows = result.data.rows;
          } else if (typeof result.data === 'object') {
            // in case server returns an object where each key is a row (rare)
            rows = Object.values(result.data).filter(v => v != null);
            // optionally try to detect nested 'result' keys
            if (rows.length === 1 && Array.isArray(rows[0])) {
              rows = rows[0];
            }
          } else {
            rows = [];
          }
        } catch (parseEx) {
          console.warn('getEvaluationList -> parse error', parseEx);
          rows = [];
        }

        if (rows && rows.length > 0) {
          this.examStudentListdata = rows;
          this.examEvaluationList = rows;
          this.dataSource = new MatTableDataSource(this.examStudentListdata);
          if (this.paginator) { this.dataSource.paginator = this.paginator; }
          if (this.sort) { this.dataSource.sort = this.sort; }
          this.snotifyService.success('Records loaded', 'Success!');
        } else {
          this.snotifyService.success('No Records Found', 'Info');
          this.examStudentListdata = [];
          this.examEvaluationList = [];
          this.dataSource = new MatTableDataSource([]);
          if (this.paginator) { this.dataSource.paginator = this.paginator; }
          if (this.sort) { this.dataSource.sort = this.sort; }
        }
      },
      error: (error: any) => {
        this.spinner.hide();
        console.error('getEvaluationList error ->', error);

        if (error?.error?.statusCode === 401) {
          this.snotifyService.error(error.error.message || 'Unauthorized', 'Error!');
          this.genericFunctions.logOut(this.router.url);
          return;
        }
        const errDetail = error?.error?.data?.errorDetails || error?.message || CONSTANTS.message.CON_ERROR;
        this.snotifyService.error(errDetail, 'Error!');
      }
    });
}

   searchdata(value) {
     this.selectedSubjects = []
     this.search(value);
   }
   search(value: string) {
     let filter = value.toLowerCase();
     for (let i = 0; i < this.subjectcode.length; i++) {
       let option = this.subjectcode[i];
       if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
         this.selectedSubjects.push(option);
       }
       else if (option.subject_code.toLowerCase().indexOf(filter) >= 0) {
         this.selectedSubjects.push(option);
       }
     }
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
       link.download = `${this.trafoexternalItem}.xls`;
       link.href = uri + base64(format(template, ctx));
       link.click();
   
 }
 printPage() {
     window.print();
 }
 goBack(){
   this.location.back()
 }
}
