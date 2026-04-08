
import { Component, OnInit, ViewChild } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { CourseGroup } from 'app/main/models/courseGroup';
import { CourseYear } from 'app/main/models/courseYearRegulation';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { StudentBatch } from 'app/main/models/studentBatch';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { ExamLabBatchModalComponent } from './exam-lab-batch-modal/exam-lab-batch-modal.component';


@Component({
  selector: 'app-exam-lab-batches',
  templateUrl: './exam-lab-batches.component.html',
  styleUrls: ['./exam-lab-batches.component.scss']
})
export class ExamLabBatchesComponent implements OnInit {


  displayedColumns: string[] = ['id', 'examtypeCatdetCode','batchName', 'capacity', 'sortOrder', 'isActive', 'actions'];
  dataSource: MatTableDataSource<StudentBatch>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private examLabBatchesCrudUrl = CONSTANTS.examLabBatchesCrudUrl;
  private getStudentBatch = CONSTANTS.getStudentBatch;
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
  private isActive = CONSTANTS.isActive;
  public ExamMasterFilterCtrl: FormControl = new FormControl();
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private examFeeType = CONSTANTS.examFeeType;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;

  colleges: College[] = [];
  examLabBatches = [];
  studentBatche: any = {};
  sectionsForm: FormGroup;
  step = 0;
  panelOpenState = true;
  filtersDetailsList: any[];
  CollegesListDetails: any[];
  CollegesListFilterDetails: any[];
  filterSubjectsListDetails: any[];
  subjectfiltersDetailsList :any[];
  regulationFilterList=[];
  data: string;
  collegeCode: string;
  courses: any[];
  courseListData: any[];
  courseYears: any[];
  academicYearsList: any;
  academicYears: any[];
  examsList: any[];
  courseGroupList: any[];
  courseGroups: any[];
  courseYearsList: any[];
  examsLists: any[];
  examData: any[];
  subjectsList: any[];
  subjectsDetailList: any[];
  subjectData: any[];
  regulationList: any[];
  flag = false;
  examLabBatch: any;
  pageParams: any;
  regulationDetailList:  any[];
  examFeeTypes=[];
  examTypes=[];
  constructor(private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, private dialog: MatDialog, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router) {
      
      this.getExamTypes();
      this.getFiltersList();
    
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.sectionsForm = this.formBuilder.group({
      academicYearId: ['', Validators.required],
      courseGroupId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      collegeId: ['', Validators.required],
      courseId: ['', Validators.required],
      subjectId: ['', Validators.required],
      examId: [],
      regulationId:[],

    });
    this.dataSource = new MatTableDataSource(this.examLabBatches);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    
  }

getExamTypes(){
  this.examTypes=[]
  this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examFeeType, 'true', this.generalDetailsByCodeUrl, this.isActive)
  .subscribe(result => {
      if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                    this.examTypes=result.data.resultList
                     

                  } else {
                      this.snotifyService.success(result.message, 'Success!');
                  }
              }else {
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
  getFiltersList(): void {
    this.spinner.show()
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_filters' },
      { paramName: 'in_flag_type', paramValue: 'ALL' },
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
              this.sectionsForm.get('courseId').setValue(this.courses[0].fk_course_id);
              this.selectedCourse(this.sectionsForm.value.courseId)
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
      this.sectionsForm.get('academicYearId').setValue('')
      this.sectionsForm.get('examId').setValue('');
      this.sectionsForm.get('collegeId').setValue('');
      this.sectionsForm.get('courseGroupId').setValue('');
      this.sectionsForm.get('courseYearId').setValue('');
      this.sectionsForm.get('regulationId').setValue('');
      this.sectionsForm.get('subjectId').setValue('');
      this.academicYears=[]
      this.examData = []
      this.colleges = []
      this.courseGroups = []
      this.courseYears = []
      this.regulationList = []
      this.subjectData = []
      this.academicYearsList=[]
      this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.sectionsForm.value.courseId))
      if (this.academicYearsList.length > 0) {
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (this.academicYears && this.academicYears.length > 0) {
        const currentAY = this.academicYears?.sort((a, b) => (b.is_curr_ay ?? 0) - (a.is_curr_ay ?? 0))[0];
        if (currentAY?.fk_academic_year_id) {
        this.sectionsForm.get('academicYearId')?.setValue(currentAY.fk_academic_year_id);
        }
        this.academicYears = this.academicYears.sort((a,b)=>parseInt(b?.academic_year) - parseInt(a?.academic_year));
        // this.sectionsForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
        this.data = this.data + ' / ' + this.academicYears.filter(x => (x.fk_academic_year_id === this.sectionsForm.value.academicYearId))[0].academic_year;
        this.selectedAcademicYear(this.sectionsForm.value.academicYearId)
      }

    }
  }




  selectedAcademicYear(academicYearId): void {
    this.sectionsForm.get('examId').setValue('');
    this.sectionsForm.get('collegeId').setValue('');
    this.sectionsForm.get('courseGroupId').setValue('');
    this.sectionsForm.get('courseYearId').setValue('');
    this.sectionsForm.get('regulationId').setValue('');
    this.sectionsForm.get('subjectId').setValue('');
    this.examsList = [];
    if (academicYearId) {
      this.examsLists = []
      this.examData = []
      this.colleges = []
      this.courseGroups = []
      this.courseYears = []
      this.regulationList = []
      this.subjectData = []
      this.examsLists = this.CollegesListFilterDetails.filter(x => (x.fk_course_id === this.sectionsForm.value.courseId && x.fk_academic_year_id == this.sectionsForm.value.academicYearId))
      if (this.examsLists.length > 0) {
        const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
        this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
        this.examData = this.examsList;
      }
      if (this.examsList.length > 0) {
        this.sectionsForm.get('examId').setValue(this.examsList[0].fk_exam_id);
        this.selectedExam(this.sectionsForm.value.examId);
      }
    }

  }
  selectedExam(examId): void {
    this.filtersDetailsList = []
    this.sectionsForm.get('collegeId').setValue('');
    this.sectionsForm.get('courseGroupId').setValue('');
    this.sectionsForm.get('courseYearId').setValue('');
    this.sectionsForm.get('regulationId').setValue('');
    this.sectionsForm.get('subjectId').setValue('');
    this.examFeeTypes = [];
    // tslint:disable-next-line: prefer-for-of
  
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_rest_no_tt' },
      { paramName: 'in_flag_type', paramValue: 'ALL' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: this.sectionsForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: this.sectionsForm.value.examId },
      { paramName: 'in_academic_year_id', paramValue: this.sectionsForm.value.academicYearId },
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
              this.courseYears = []
              this.regulationList = []
              this.subjectData = []
              this.colleges = this.CollegesListDetails
              const CollegeIdData = this.colleges.map(({ fk_college_id }) => fk_college_id);
              this.colleges = this.colleges.filter(({ fk_college_id }, index) => !CollegeIdData.includes(fk_college_id, index + 1));
              if (this.colleges.length > 0) {
                this.sectionsForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                this.data = this.colleges.filter(x => (x.fk_college_id === this.sectionsForm.value.collegeId))[0].college_code;
                this.selectedCollege(this.sectionsForm.value.collegeId);
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

    this.courseGroups = []
    this.sectionsForm.get('courseGroupId').setValue('');
    this.sectionsForm.get('courseYearId').setValue('');
    this.sectionsForm.get('regulationId').setValue('');
    this.sectionsForm.get('subjectId').setValue('');
    if (collegeId != null) {
      this.courseGroupList = []
      this.courseGroups = []
      this.courseYears = []
      this.regulationList = []
      this.subjectData = []
      this.courseGroupList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.sectionsForm.value.collegeId ))
      if (this.courseGroupList.length > 0) {
        const courseGroups = this.courseGroupList.map(({ fk_course_group_id }) => fk_course_group_id);
        this.courseGroups = this.courseGroupList.filter(({ fk_course_group_id }, index) => !courseGroups.includes(fk_course_group_id, index + 1));
      }
      if (this.courseGroups.length > 0) {
        this.sectionsForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
        this.selectedGroup(this.sectionsForm.value.courseGroupId)
      }
    }

    
  }



  selectedGroup(courseGroupId): void {
    this.sectionsForm.get('courseYearId').setValue('');
    this.sectionsForm.get('regulationId').setValue('');
    this.sectionsForm.get('subjectId').setValue('');
    this.courseYearsList = []
    this.courseYears = []
    this.regulationList = []
    this.subjectData = []

    /*----------- COURSES Years -----------*/
    this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.sectionsForm.value.collegeId && x.fk_course_group_id == courseGroupId))
    if (this.courseYearsList.length > 0) {
      const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
    }
    //      if (!this.isEmptyObject(this.pageParams) && this.courseYears.length > 0){
    //       this.sectionsForm.get('courseYearId').setValue(+this.pageParams.courseYearId);
    //       this.selectedYear( this.sectionsForm.value.courseYearId);
    // } 
    //    else 
    if (this.courseYears.length > 0) {
      this.sectionsForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
      this.selectedYear(this.sectionsForm.value.courseYearId);
    }
  }
  selectedYear(courseYearId){
    this.sectionsForm.get('subjectId').setValue('');
    this.sectionsForm.get('regulationId').setValue('');
    this.regulationList = []
    this.subjectData = []
    if (courseYearId) {
      if (this.regulationFilterList.length > 0) {
        const regulationDetailList = this.regulationFilterList.map(({ fk_regulation_id }) => fk_regulation_id);
        this.regulationList = this.regulationFilterList.filter(({ fk_regulation_id }, index) => !regulationDetailList.includes(fk_regulation_id, index + 1));
      }
    
      if (this.regulationList.length > 0) {
        // this.bulkHallticketDetails =[]
        // this.bulkTable=false
        this.sectionsForm.get('regulationId').setValue(this.regulationList[0].fk_regulation_id);
        this.selectedRegulation(this.sectionsForm.value.regulationId)
      }

    }
  }

  selectedRegulation(regulationId): void {
    this.sectionsForm.get('subjectId').setValue('');
      this.subjectsDetailList = []
      this.subjectData = []
      this.subjectsList =[]
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_subject_uc' },
        { paramName: 'in_flag_type', paramValue: 'ALL' },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: this.sectionsForm.value.collegeId },
        { paramName: 'in_course_id', paramValue: this.sectionsForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: this.sectionsForm.value.courseGroupId },
        { paramName: 'in_course_year_id', paramValue: this.sectionsForm.value.courseYearId },
        { paramName: 'in_exam_id', paramValue: this.sectionsForm.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.sectionsForm.value.academicYearId },
        { paramName: 'in_regulation_id', paramValue:  this.sectionsForm.value.regulationId },
        { paramName: 'in_subject_id', paramValue: 0 },
        { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
        { paramName: 'in_loginuser_roleid', paramValue: 0 },
        { paramName: 'in_sub_flag_type', paramValue: 'LAB' },
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
                //     if (!this.isEmptyObject(this.pageParams) && this.examsList.length > 0){
                //       this.sectionsForm.get('examId').setValue(+this.pageParams.examId);
                //       this.getHallTickets();
                // } 
                //    else 
                
                if (this.subjectsList.length > 0) {
                  // this.bulkHallticketDetails =[]
                  // this.bulkTable=false
                  this.sectionsForm.get('subjectId').setValue(this.subjectsList[0].fk_subject_id);
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
  selectedSubject() {
    this.flag = false
  }
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  getDetails(): void {
    this.flag = true
    this.spinner.show();
    // tslint:disable-next-line:max-line-length
    this.crudService.listDetailsBySixIds(this.examLabBatchesCrudUrl,
      this.sectionsForm.value.collegeId, this.sectionsForm.value.examId, this.sectionsForm.value.courseYearId, this.sectionsForm.value.courseGroupId, 
      this.sectionsForm.value.regulationId, this.sectionsForm.value.subjectId,
      'college.collegeId', 'examMaster.examId', 'courseYear.courseYearId', 'courseGroup.courseGroupId', 'Regulation.regulationId', 'subject.subjectId')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.examLabBatches = result.data.resultList;
            this.dataSource = new MatTableDataSource(this.examLabBatches);
            this.dataSource.paginator = this.paginator;
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


  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(ExamLabBatchModalComponent, {
      width: '750px',
      data: [this.sectionsForm.value,this.examsList]
    });

    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
        this.spinner.show();

        /*---------- ADD Student Batch ----------*/
        this.crudService.addDetails(this.examLabBatchesCrudUrl, details)
          .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '') {
                this.snotifyService.success(result.message, 'Success!');
                this.getDetails();
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
    });
  }

  /*---------- EDIT SECTION -----------*/
  editDialog(data): void {
    this.examLabBatch = data;
    const dialogRef = this.dialog.open(ExamLabBatchModalComponent, {
      width: '750px',
      data: [this.examLabBatch,this.examsList]
    });

    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
        details.eaxmLabBatchId = data.eaxmLabBatchId;
        this.updateData(details);
      }
    });
  }
  /*------------ UPDATE SECTION -----------*/
  updateData(details): void {
    this.spinner.show();
    this.crudService.updateDetails(this.examLabBatchesCrudUrl, details, details.eaxmLabBatchId, 'eaxmLabBatchId')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.snotifyService.success(result.message, 'Success!');
            this.getDetails();
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
