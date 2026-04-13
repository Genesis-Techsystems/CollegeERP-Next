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
// import 'moment-timezone';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { GlobalService } from 'app/main/services/global.service';

@Component({
  selector: 'app-group-yearwise-result-report',
  templateUrl: './group-yearwise-result-report.component.html',
  styleUrls: ['./group-yearwise-result-report.component.scss']
})
export class GroupYearwiseResultReportComponent implements OnInit {
// displayedColumns: string[] = ['sno', 'course', 'courseGroup', 'courseyear', 'section','Subject','enrolled','present','internalmarks'];
  // displayedColumns: string[] = ['sno', 'course', 'courseyear','Subject','Appeared', 'O_grade','Aplus_grade','A_grade','B_grade','C_grade','D_grade','E_grade','passed','Passed_with_60_percent'];
  displayedColumns: string[] =[]
  // dataSource: MatTableDataSource<any>;
  dataSource = new MatTableDataSource<Element>();
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('TABLE') excelTable: ElementRef;
  staffForm: FormGroup;
  private ExamPreModerationUrl = CONSTANTS.ExamPreModerationUrl;
  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
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
  collegeLogo:any
  courseGroupName: any;
  courseListData: any[];
  courses: any[];
  courseYearsList: any[];
  regulationList: any[];
  courseYears: any[];
  courseGroupList: any[];
  regulationFilterList: any;
  academicYearsList: any;
  academicYears: any[];
  CollegesListFilterDetails: any;
  constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, private _globalService: GlobalService,
    private dialog: MatDialog, private genericFunctions: GenericFunctions) {
      this.dashboard = CONSTANTS.dashboard;
}

  ngOnInit(): void {
    this.staffForm = this.formBuilder.group({
      collegeId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      examId: ['', Validators.required],
      courseGroupId:[0],
      courseId:['', Validators.required]
      
     
    }); 
    this.getFiltersList();
    this.dataSource = new MatTableDataSource<any>(this.gradesDetailsList);
    setTimeout(() =>this.dataSource.paginator = this.paginator);
    this.dataSource.sort = this.sort;

  }
  reset(): void{
    this.staffForm.get('collegeId').setValue('');
    this.staffForm.get('examId').setValue('');
    this.staffForm.get('courseGroupId').setValue(0);
    this.staffForm.get('courseId').setValue(0);

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
                    console.log(this.filtersDetailsList[i]);
    
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
                  //     /*----------- COURSES Years -----------*/      
    
    
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
        this.courseGroupName = this.courseGroups.filter(x=>(x.fk_course_group_id == this.staffForm.value.courseGroupId))[0].group_code;

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

  getGradeList(): void {
    this.gradesDetailsList=[]
    if(this.staffForm.valid){
    this.spinner.show();
    let request = [
      {paramName: 'in_flag', paramValue:'exam_pre_mod_ext_int_group'},
      {paramName: 'in_exam_id', paramValue: this.staffForm.value.examId},
      {paramName: 'in_college_id', paramValue: this.staffForm.value.collegeId},
      {paramName: 'in_course_id', paramValue: 0},
      {paramName: 'in_course_group_id', paramValue:this.staffForm.value.courseGroupId},
      {paramName: 'in_course_year_id', paramValue: 0},
      {paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId},
      {paramName: 'in_regulation_id', paramValue: 0},
      {paramName: 'in_subject_id', paramValue: 0},
    ];
    this.crudService.getDetailsByRequest(this.ExamPreModerationUrl, '', request, '&')
  .subscribe(result =>  {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.gradesDetailsList = result.data.result[0];
                  this.dataSource = new MatTableDataSource<any>(this.gradesDetailsList);
                  this.displayedColumns = Object.keys(this.gradesDetailsList[0]);
                  this.displayedColumns.splice(0, 5);
                     this.displayedColumns.splice(1, 2);

                  // this.displayedColumns.splice(0, 7);

                  // this.displayedColumns.splice(0, 2);
                  //    this.displayedColumns.splice(1, 1);
                  //    this.displayedColumns.splice(1, 2);

                    //  this.displayedColumns.splice(2, 0);
                    //  this.displayedColumns.splice(2, 1);

                    //  this.displayedColumns.splice(1, 2);
                    //  this.displayedColumns.splice(2, 2);

                  // this.displayedColumns.splice(0, 3);
                  // this.displayedColumns.splice(0, 4);
                  // this.displayedColumns.splice(0, 5);

                  // this.displayedColumns.splice(1, 1);
                  // this.displayedColumns.splice(1, 2);
                  // this.displayedColumns.splice(2, 0);
                  // this.displayedColumns.splice(2, 1);

                  // this.displayedColumns.splice(2, 2);
                  // this.displayedColumns.splice(3, 2);
                  // this.displayedColumns.splice(4, 1);
                  // this.displayedColumns.splice(5, 1);
                  // for(let i=0;i<this.gradesDetailsList.length;i++){
                  //  if(this.gradesDetailsList.){

                  //  }
                  // }

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
    XLSX.writeFile(wb, 'Group & Year Wise Result Report.xlsx');
    
  }
  printPage(){
    window.print()
  }
}