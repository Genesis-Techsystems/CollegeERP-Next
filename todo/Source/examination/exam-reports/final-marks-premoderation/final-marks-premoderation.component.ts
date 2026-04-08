import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CONSTANTS } from 'app/main/common/constants';
import { Router, ActivatedRoute } from '@angular/router';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import * as XLSX from 'xlsx';


import * as moment from 'moment';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { GlobalService } from 'app/main/services/global.service';

@Component({
  selector: 'app-final-marks-premoderation',
  templateUrl: './final-marks-premoderation.component.html',
  styleUrls: ['./final-marks-premoderation.component.scss']
})
export class FinalMarksPremoderationComponent implements OnInit {
// displayedColumns: string[] = ['sno', 'course', 'courseGroup', 'courseyear', 'section','Subject','enrolled','present','internalmarks'];
  // displayedColumns: string[] = ['sno', 'course', 'courseyear','Subject','Appeared', 'O_grade','Aplus_grade','A_grade','B_grade','C_grade','D_grade','E_grade','passed','Passed_with_60_percent'];
  displayedColumns: string[] =[]
  // dataSource: MatTableDataSource<any>;
  dataSource = new MatTableDataSource<Element>();
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('TABLE') excelTable: ElementRef;

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private ExamPreModerationUrl = CONSTANTS.ExamPreModerationUrl;
  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;

  staffForm: FormGroup;
  dashboard : any
  filtersDetailsList=[];
  marksListDetails=[];
  gradesDetailsList=[];
  CollegesListDetails=[];
  colleges=[];
  examsList=[];
  searchExams=[];
  filteredExams :any ;
  examData=[];
  examsLists=[];
  fromDate: string;
  toDate: string;
  panelOpenState = true;
  step = 0;  
  trafoItem="Subject & GradeWise Report";
  collegeCode: any;
  exam: any;
  collegeName: any;
  groupList: any[];
  courseGroups: any[];
  examTimetableSubjectsList: any[];
  examTimetableSubjects: any[];
  collegeLogo = [];
  orgCode = '';
  Logo:any;
  examName: any;
  collegeLists=[];
  academicYearsList=[];
  academicYears=[];
  courses=[];
  CollegesListFilterDetails: any;
  courseYearsList: any[];
  courseYears: any[];
  regulationList: any[];
  regulationFilterList: any;
  courseGroupList: any[];
  examRegisteredStudents: any[];
  subjectsDetailList: any[];
  subjectsList: any[];
  subjectData: any[];

  constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, private _globalService: GlobalService,
    private dialog: MatDialog, private genericFunctions: GenericFunctions) {
      this.dashboard = CONSTANTS.dashboard;
      this.orgCode = localStorage.getItem('orgCode');
}

  ngOnInit(): void {
    this.staffForm = this.formBuilder.group({
      courseId: ['', Validators.required],
      collegeId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      examId: ['', Validators.required],
      courseGroupId:[''],
      subjectId:[''],
      regulationId:[''],
      courseYearId:['']
     
    }); 
    this.getFiltersList();
    this.dataSource = new MatTableDataSource<any>(this.gradesDetailsList);
    setTimeout(() =>this.dataSource.paginator = this.paginator);
    this.dataSource.sort = this.sort;

  }
  reset(): void{
    this.staffForm.get('collegeId').setValue('');
    this.staffForm.get('examId').setValue('');
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('subjectId').setValue(0);
    this.gradesDetailsList = [];
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
                      this.staffForm.get('courseId').setValue(this.courses[0].fk_course_id);
                      this.selectedCourse(this.staffForm.value.courseId)
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
              this.staffForm.get('academicYearId').setValue('')
              this.staffForm.get('examId').setValue('');
              this.staffForm.get('collegeId').setValue('');
              this.staffForm.get('courseGroupId').setValue('');
              this.staffForm.get('courseYearId').setValue('');
              this.academicYears = []
              this.examsList = [];
              this.filtersDetailsList = []
              this.colleges = []
              this.courseGroups = []
              this.courseYearsList = []
              this.courseYears = []
              this.regulationList = []
              this.academicYearsList = []
              this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId))
           
        
              if (this.academicYearsList.length > 0) {
                const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
                this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
              }
              if (this.academicYears.length > 0) {
                this.staffForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
                this.selectedAcademicYear(this.staffForm.value.academicYearId)
              }
        
            }
          }
        
        
        
        
          selectedAcademicYear(academicYearId): void {
            this.staffForm.get('examId').setValue('');
            this.staffForm.get('collegeId').setValue('');
            this.staffForm.get('courseGroupId').setValue('');
            this.staffForm.get('courseYearId').setValue('');
            this.examsList = [];
            this.filtersDetailsList = []
            this.colleges = []
            this.courseGroups = []
            this.courseYearsList = []
            this.courseYears = []
            this.regulationList = []
            if (academicYearId) {
              this.examsLists = []
              this.examData = []
              this.examsLists = this.CollegesListFilterDetails.filter(x => (x.fk_course_id === this.staffForm.value.courseId && x.fk_academic_year_id == this.staffForm.value.academicYearId))
              if (this.examsLists.length > 0) {
                const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
                this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
                this.examData = this.examsList;
              }
              if (this.examsList.length > 0) {
                this.staffForm.get('examId').setValue(this.examsList[0].fk_exam_id);
                this.selectedExam(this.staffForm.value.examId);
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
            this.staffForm.get('collegeId').setValue('');
            this.staffForm.get('courseGroupId').setValue('');
            this.staffForm.get('courseYearId').setValue('');
            let request = [
              { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_regexamstd' },
              { paramName: 'in_flag_type', paramValue: 'ALL' },
              { paramName: 'in_university_id', paramValue: 0 },
              { paramName: 'in_college_id', paramValue: 0 },
              { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
              { paramName: 'in_course_group_id', paramValue: 0 },
              { paramName: 'in_course_year_id', paramValue: 0 },
              { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
              { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
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
                      /*----------- Colleges -----------*/
                      this.colleges = []
                      this.courseGroups = []
                      this.courseYearsList = []
                      this.courseYears = []
                      this.regulationList = []
                      this.colleges = this.CollegesListDetails
                      const CollegeIdData = this.colleges.map(({ fk_college_id }) => fk_college_id);
                      this.colleges = this.colleges.filter(({ fk_college_id }, index) => !CollegeIdData.includes(fk_college_id, index + 1));
                      if (this.colleges.length > 0) {
                        this.staffForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                        this.selectedCollege(this.staffForm.value.collegeId);
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
            this.staffForm.get('courseGroupId').setValue('');
            this.staffForm.get('courseYearId').setValue('');
            if (collegeId != null) {
              this.courseGroupList = []
              this.courseGroups = []
              this.courseGroupList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.staffForm.value.collegeId))
              if (this.courseGroupList.length > 0) {
                const courseGroups = this.courseGroupList.map(({ fk_course_group_id }) => fk_course_group_id);
                this.courseGroups = this.courseGroupList.filter(({ fk_course_group_id }, index) => !courseGroups.includes(fk_course_group_id, index + 1));
              }
              if (this.courseGroups.length > 0) {
                this.staffForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
                this.selectedGroup(this.staffForm.value.courseGroupId)
              }
            }
          }

          selectedGroup(courseGroupId): void {
            this.staffForm.get('courseYearId').setValue('');
            this.courseYearsList = []
            this.courseYears = []
            this.regulationList = []
        
            /*----------- COURSES Years -----------*/
            this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.staffForm.value.collegeId && x.fk_course_group_id == courseGroupId))
            if (this.courseYearsList.length > 0) {
              const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
              this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
            }
        
            if (this.courseYears.length > 0) {
              this.staffForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
              this.selectedYear(this.staffForm.value.courseYearId);
            }
          }
     
     
        selectedYear(courseYearId){
          this.examRegisteredStudents = [];
          this.staffForm.get('regulationId').setValue('');
         this.regulationList = []
         if (courseYearId) {
     
           this.regulationFilterList = this.CollegesListDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId))
     
           if (this.regulationFilterList.length > 0) {
             const regulationDetailList = this.regulationFilterList.map(({ fk_regulation_id }) => fk_regulation_id);
             this.regulationList = this.regulationFilterList.filter(({ fk_regulation_id }, index) => !regulationDetailList.includes(fk_regulation_id, index + 1));
           }
         
           if (this.regulationList.length > 0) {
             // this.bulkHallticketDetails =[]
             // this.bulkTable=false
             this.staffForm.get('regulationId').setValue(this.regulationList[0].fk_regulation_id);
             this.selectedRegulation(this.staffForm.value.regulationId);
           }
     
         }
       }
    selectedRegulation(regulationId): void {
      this.staffForm.get('subjectId').setValue('');
        this.subjectsDetailList = []
        this.subjectData = []
        this.subjectsList =[]
        let request = [
          { paramName: 'in_flag', paramValue: 'univ_exam_subject_uc' },
          { paramName: 'in_flag_type', paramValue: 'ALL' },
          { paramName: 'in_university_id', paramValue: 0 },
          { paramName: 'in_college_id', paramValue: this.staffForm.value.collegeId },
          { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
          { paramName: 'in_course_group_id', paramValue: this.staffForm.value.courseGroupId },
          { paramName: 'in_course_year_id', paramValue: this.staffForm.value.courseYearId },
          { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
          { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
          { paramName: 'in_regulation_id', paramValue:  this.staffForm.value.regulationId },
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
                    // this.bulkHallticketDetails =[]
                    // this.bulkTable=false
                    this.staffForm.get('subjectId').setValue(this.subjectsList[0].fk_subject_id);
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
      
    }
  
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
  getGradeList(): void {
    this.gradesDetailsList=[];
    this.dataSource = new MatTableDataSource<any>([]);
    this.displayedColumns = Object.keys([]);
    if(this.staffForm.valid){
    this.spinner.show();
    this.getColleges();
    let request = [
      {paramName: 'in_flag', paramValue:'exam_pre_mod_ext_results_subject'},
      {paramName: 'in_exam_id', paramValue: this.staffForm.value.examId},
      {paramName: 'in_college_id', paramValue: this.staffForm.value.collegeId},
      {paramName: 'in_course_id', paramValue: 0},
      {paramName: 'in_course_group_id', paramValue:this.staffForm.value.courseGroupId},
      {paramName: 'in_course_year_id', paramValue: 0},
      {paramName: 'in_academic_year_id', paramValue: 0},
      {paramName: 'in_regulation_id', paramValue: this.staffForm.value.regulationId},
      {paramName: 'in_subject_id', paramValue: this.staffForm.value.subjectId},
    ];
    this.crudService.getDetailsByRequest(this.ExamPreModerationUrl, '', request, '&')
  .subscribe(result =>  {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.gradesDetailsList = result.data.result[0];
              this.exam = this.gradesDetailsList[0]?.exam_label_name;
                  this.dataSource = new MatTableDataSource<any>(this.gradesDetailsList);
                  this.displayedColumns = Object.keys(this.gradesDetailsList[0]);
                  this.displayedColumns.splice(0, 1);
                  this.displayedColumns.splice(1, 1);
                  this.displayedColumns.splice(2, 1);
                  setTimeout(() =>this.dataSource.paginator = this.paginator);
                   this.dataSource.sort = this.sort;
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
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
        this.dataSource.paginator.firstPage();
    }
}

  exportAsExcel()
  {
    const ws: XLSX.WorkSheet=XLSX.utils.table_to_sheet(this.excelTable.nativeElement);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    /* save to file */
    XLSX.writeFile(wb, 'Final Marks Pre Moderation Report.xlsx');
    
  }
  printPage(){
    window.print()
  }
}