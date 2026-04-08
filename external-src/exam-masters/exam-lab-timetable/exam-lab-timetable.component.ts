import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CONSTANTS } from 'app/main/common/constants';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { Router, ActivatedRoute } from '@angular/router';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { AddExamTimetableComponent } from 'app/main/apps/staff-examinations/exam-timetable/add-exam-timetable/add-exam-timetable.component';
import { CheckConflictsModalsComponent } from './check-conflicts-modals/check-conflicts-modals.component';
import { EditExamTimetablesComponent } from './edit-exam-timetables/edit-exam-timetables.component';

@Component({
  selector: 'app-exam-lab-timetable',
  templateUrl: './exam-lab-timetable.component.html',
  styleUrls: ['./exam-lab-timetable.component.scss']
})
export class ExamLabTimetableComponent implements OnInit {

  displayedColumns: string[] = ['id', 'groupCode', 'regulationCode', 'subjectCode', 'examTypeCatCode', 'examDate', 'examSessionName', 'actions'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  panelOpenState = true;
  private isActive = CONSTANTS.isActive;
  private examtTimetableDetailsUrl = CONSTANTS.examtTimetableDetailsUrl;
  private getExamtimeTableDetailsUrl = CONSTANTS.getExamtimeTableDetailsUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private examFeeType = CONSTANTS.examFeeType;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private examtimeTabledetailsByExamDateUrl = CONSTANTS.examtimeTabledetailsByExamDateUrl;
  public dateFormate = CONSTANTS.dateFormate;
  private examTimetablePostUrl = CONSTANTS.examTimetablePostUrl;
  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
  public ExamMasterFilterCtrl: FormControl = new FormControl();
  private collegeWiseLabDetailsUrl=CONSTANTS.collegeWiseLabDetailsUrl;
  private examTimetableLabBatchesUrl=CONSTANTS.examTimetableLabBatchesUrl;


  staffForm: FormGroup;
  colleges: College[] = [];
  courses: Course[] = [];
  step = 0;
  examTimetableList: any[] = [];
  pageParams: any = {};
  examFeeTypes: GeneralDetail[] = [];
  courseYears: any[] = [];
  examsList: any[] = [];
  examTimetble: any[] = [];
  academicYears: any[] = [];
  courseGroups: any[] = [];
  duplicateCourseGroups: any[] = [];
  dateArray = [];
  arr = [];
  collegeCode;
  courseCode;
  examYear;
  courseYear;
  academicYear;
  examDetails: any = {};
  data;
  dataSecStaff;
  dataSECPrincipal;
  days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  examMasters: any[];
  filtersDetailsList: any[];
  CollegesListDetails: any[];
  CollegesListFilterDetails: any[];
  courseListData: any[];
  academicYearsList: any[];
  examsLists: any[];
  examData: any[];
  courseYearsList: any[];
  groupDetails: any[];
  collegeData = [];
  colegesData = [];
  regulationFilterList=[];

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService, private crudService: CrudService, private spinner: NgxSpinnerService,
    private router: Router, private dialog: MatDialog,
    private route: ActivatedRoute, private genericFunctions: GenericFunctions, private storage: LocalStorage) {

  }

  // tslint:disable-next-line:typedef
  ngOnInit() {

    this.dataSource = new MatTableDataSource(this.examTimetableList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.staffForm = this.formBuilder.group({
      collegeId: ['', Validators.required],
      courseId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      // examTypeId: [''],
      examId: ['', Validators.required],
    });

    this.dataSecStaff = this.genericFunctions.dataSecurityLevel();
    this.dataSECPrincipal = this.genericFunctions.dataSecurityLevelPrincipal();

    this.route.queryParams
      .subscribe(params => {
        if (!this.isEmptyObject(params)) {
          this.pageParams.collegeId = +params.collegeId;
          this.pageParams.courseId = +params.courseId;
          this.pageParams.academicYearId = +params.academicYearId;
          this.pageParams.courseYearId = +params.courseYearId;
          this.pageParams.examId = +params.examId;
        }
      });

    this.getData();
    this.getFiltersList();
  }

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  getFiltersList(): void {
    this.filtersDetailsList = []
    this.CollegesListDetails = []
    this.groupDetails = []
    this.colleges = []
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
            if (!this.isEmptyObject(this.pageParams) && this.courses.length > 0) {
              this.staffForm.get('courseId').setValue(+this.pageParams.courseId);
              this.selectedCourse(this.staffForm.value.courseId);
            }
            else if (this.courses.length > 0) {
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
      this.courseCode = this.courses.filter(x => (x.fk_course_id === courseId))[0].course_code;
      this.examTimetableList = [];
      this.dataSource = new MatTableDataSource(this.examTimetableList);
      this.staffForm.get('courseYearId').setValue('');
      this.staffForm.get('academicYearId').setValue('')
      this.courseYears = [];
      this.academicYearsList = []
      this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId))
      if (this.academicYearsList.length > 0) {
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (!this.isEmptyObject(this.pageParams) && this.academicYears.length > 0) {
        this.staffForm.get('academicYearId').setValue(+this.pageParams.academicYearId);
        this.academicYears = this.academicYears.sort((a,b)=>parseInt(b?.academic_year) - parseInt(a?.academic_year));
        this.selectedAcademicYear(this.staffForm.value.academicYearId);
      }
      else if (this.academicYears && this.academicYears.length > 0) {
        const currentAY = this.academicYears?.sort((a, b) => (b.is_curr_ay ?? 0) - (a.is_curr_ay ?? 0))[0];
        if (currentAY?.fk_academic_year_id) {
        this.staffForm.get('academicYearId')?.setValue(currentAY.fk_academic_year_id);
        }
        this.academicYears = this.academicYears.sort((a,b)=>parseInt(b?.academic_year) - parseInt(a?.academic_year));
        // this.staffForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
        this.data = this.data + ' / ' + this.academicYears.filter(x => (x.fk_academic_year_id === this.staffForm.value.academicYearId))[0].academic_year;
        this.selectedAcademicYear(this.staffForm.value.academicYearId);
      }
    }
  }

  selectedAcademicYear(academicYearId): void {
    this.academicYear = this.academicYears.filter(x => (x.fk_academic_year_id === this.staffForm.value.academicYearId))[0].academic_year;
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('examId').setValue('');
    this.courseYearsList = [];
    this.examTimetableList = [];
    this.examsList = [];
    if (academicYearId) {
      this.examsLists = []
      this.examData = []
      this.examsLists = this.CollegesListFilterDetails.filter(x => (x.fk_course_id === this.staffForm.value.courseId && x.fk_academic_year_id == this.staffForm.value.academicYearId))
      if (this.examsLists.length > 0) {
        const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
        this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
        this.examData = this.examsList;
      }
      
      if (!this.isEmptyObject(this.pageParams) && this.examsList.length > 0) {
        this.staffForm.get('examId').setValue(+this.pageParams.examId);
        this.selectedExam(this.staffForm.value.examId);
      }
      else if (this.examsList.length > 0) {
        this.staffForm.get('examId').setValue(this.examsList[0].fk_exam_id);
        this.selectedExam(this.staffForm.value.examId);
      }
    }
  }

  selectedExam(examId): void {
    this.filtersDetailsList = []
    this.examTimetableList = [];
    this.dataSource = new MatTableDataSource(this.examTimetableList);
    this.staffForm.get('courseYearId').setValue('');
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_rest_no_tt' },
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

            if (this.CollegesListDetails.length > 0) {
              /*----------- Colleges -----------*/
              this.colegesData = []
              this.colegesData = this.CollegesListDetails
              const CollegeIdData = this.colegesData.map(({ fk_college_id }) => fk_college_id);
              this.colleges = this.colegesData.filter(({ fk_college_id }, index) => !CollegeIdData.includes(fk_college_id, index + 1));
              if (!this.isEmptyObject(this.pageParams) && this.colleges.length > 0) {
                this.staffForm.get('collegeId').setValue(+this.pageParams.collegeId);
                this.selectedCollege();
              }
              else if (this.colleges.length > 0) {
                this.staffForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                this.data = this.colleges.filter(x => (x.fk_college_id === this.staffForm.value.collegeId))[0].college_code;
                this.selectedCollege();
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
  selectedCollege(): void {
    this.staffForm.get('courseYearId').setValue('')
    this.courseYears = []
    this.courseYearsList = []
    this.courseYearsList = this.CollegesListDetails.filter(x => ( x.fk_college_id == this.staffForm.value.collegeId))
    if (this.courseYearsList.length > 0) {
      const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
    }
    if (!this.isEmptyObject(this.pageParams) && this.courseYears.length > 0) {
      this.staffForm.get('courseYearId').setValue(+this.pageParams.courseYearId);
      this.selectedCourseYear();
    }
    else {
      // this.staffForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id)
    }

  }

  selectedCourseYear(){
    this.collegeCode = this.colleges.filter(x => (x.fk_college_id === this.staffForm.value.collegeId))[0]?.college_code;
    this.courseGroups=[]
    this.duplicateCourseGroups=[]
    this.courseYear =  this.courseYears.filter(x => (x.fk_course_year_id === this.staffForm.value.courseYearId))[0].course_year_code;
    this.duplicateCourseGroups=this.groupDetails.filter(x=>(x.fk_course_id==this.staffForm.value.courseId))
    this.duplicateCourseGroups = this.CollegesListDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId))
    if (this.duplicateCourseGroups.length > 0) {
      const courseGroupsList = this.duplicateCourseGroups.map(({ fk_course_group_id }) => fk_course_group_id);
      this.courseGroups = this.duplicateCourseGroups.filter(({ fk_course_group_id }, index) => !courseGroupsList.includes(fk_course_group_id, index + 1));
    }

    this.examTimetableList = [];  
    this.examDetails =  this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0];
    this.dataSource = new MatTableDataSource(this.examTimetableList); 
    // this.courseGroups = [];
    // this.courseGroups = this.duplicateCourseGroups ;
    if (this.staffForm.valid){
        this.spinner.show();
        let request = [
          
         {paramName: 'in_flag', paramValue: 'view_timetable'},
         {paramName: 'in_org_id', paramValue:+localStorage.getItem('organizationId')},
         {paramName: 'in_college_id', paramValue: this.staffForm.value.collegeId},
         {paramName: 'in_course_id', paramValue: this.staffForm.value.courseId},
         {paramName: 'in_course_group_id', paramValue: 0},
         {paramName: 'in_course_year_id', paramValue: this.staffForm.value.courseYearId},
         {paramName: 'in_group_section_id', paramValue: 0},
         {paramName: 'in_academic_year_id', paramValue: 0},
         // {paramName: 'in_regulation_id', paramValue: 0},
         {paramName: 'in_dept_id', paramValue: 0},
         {paramName: 'in_isadmin', paramValue: 0},
         {paramName: 'in_exam_id', paramValue: this.staffForm.value.examId},
         {paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId')},
         {paramName: 'in_loginuser_roleid', paramValue: 0},
         {paramName: 'in_employee', paramValue: ''},
         {paramName: 'in_subject', paramValue: ''},
         {paramName: 'in_gm_codes', paramValue:''},
       ];
       this.crudService.getDetailsByRequest(this.collegeWiseLabDetailsUrl, '', request, '&')
     .subscribe(result =>  {
             this.spinner.hide();
             if (result.statusCode === 200) {
               if (result.data && result.data !== '' && result.data.result.length > 0) {
                 
                   this.examTimetableList = result.data.result[0];  
                   for (let i = 0; i < this.examTimetableList.length; i++){
                       if (this.examTimetableList[i].shortName === null || this.examTimetableList[i].shortName === ''){
                           this.examTimetableList[i].shortName = this.examTimetableList[i].subjectCode;
                       } 
                   }
                   if (this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId)).length > 0){
                       const fromDate = this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0].from_date;
                       const toDate = this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0].to_date;
                       const dayInterval = 1000 * 60 * 60 * 24;
                       // const halfDayInterval = 1000 * 60 * 60 * 12;
                       this.dateArray = this.getBetweenDates(new Date(fromDate), new Date(toDate), dayInterval);
                       this.storage.setItem('dateArray', this.getBetweenDates(new Date(fromDate), new Date(toDate), dayInterval)).subscribe({
                           next: () => {},
                           error: (error) => {},
                       });
                    } 
                   // tslint:disable-next-line: prefer-for-of
                   for (let i = 0; i < this.courseGroups.length; i++){
                        this.courseGroups[i].dates = [];
                        const fromDate = this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0].from_date;
                        const toDate = this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0].to_date;
                        const dayInterval = 1000 * 60 * 60 * 24;
                        this.courseGroups[i].dates = this.getBetweenDates(new Date(fromDate), new Date(toDate), dayInterval);
                        // tslint:disable-next-line: prefer-for-of
                        for (let j = 0; j < this.courseGroups[i].dates.length; j++){
                           if (this.examTimetableList.filter(x => (x.courseGroupId === this.courseGroups[i].fk_course_group_id && 
                             x.examDate === this.genericFunctions.momentFormatYMD1(this.courseGroups[i].dates[j]))).length > 0){
                                 // tslint:disable-next-line: max-line-length
                                 this.courseGroups[i].dates[j].subjectDetails = this.examTimetableList.filter(x => (x.courseGroupId === this.courseGroups[i].fk_course_group_id && 
                                     x.examDate === this.genericFunctions.momentFormatYMD1(this.courseGroups[i].dates[j])));
                           }
                        }
                    }
                   this.storage.setItem('courseGroups', this.courseGroups).subscribe({
                       next: () => {},
                       error: (error) => {},
                   });
                   this.dataSource = new MatTableDataSource(this.examTimetableList);  
                   this.dataSource.paginator = this.paginator;
                   this.dataSource.sort = this.sort;
               } else {
                   if (this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId)).length > 0){
                       const fromDate = this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0].from_date;
                       const toDate = this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0].to_date;
                       const dayInterval = 1000 * 60 * 60 * 24;
                       // const halfDayInterval = 1000 * 60 * 60 * 12;
                       this.dateArray = this.getBetweenDates(new Date(fromDate), new Date(toDate), dayInterval);
                       this.storage.setItem('dateArray', this.getBetweenDates(new Date(fromDate), new Date(toDate), dayInterval)).subscribe({
                           next: () => {},
                           error: (error) => {},
                       });
                    } 
                   // tslint:disable-next-line: prefer-for-of
                   for (let i = 0; i < this.courseGroups.length; i++){
                        this.courseGroups[i].dates = [];
                        const fromDate = this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0].from_date;
                        const toDate = this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0].to_date;
                        const dayInterval = 1000 * 60 * 60 * 24;
                        this.courseGroups[i].dates = this.getBetweenDates(new Date(fromDate), new Date(toDate), dayInterval);
                        // tslint:disable-next-line: prefer-for-of
                        for (let j = 0; j < this.courseGroups[i].dates.length; j++){
                           if (this.examTimetableList.filter(x => (x.courseGroupId === this.courseGroups[i].fk_course_group_id && 
                             x.examDate === this.genericFunctions.momentFormatYMD1(this.courseGroups[i].dates[j]))).length > 0){
                                 // tslint:disable-next-line: max-line-length
                                 this.courseGroups[i].dates[j].subjectDetails = this.examTimetableList.filter(x => (x.courseGroupId === this.courseGroups[i].fk_course_group_id && 
                                     x.examDate === this.genericFunctions.momentFormatYMD1(this.courseGroups[i].dates[j])));
                           }
                        }
                    }
                   this.storage.setItem('courseGroups', this.courseGroups).subscribe({
                       next: () => {},
                       error: (error) => {},
                   });

                   this.dataSource = new MatTableDataSource(this.examTimetableList);  
                   this.dataSource.paginator = this.paginator;
                   this.dataSource.sort = this.sort;
                 //  this.snotifyService.success(result.message, 'Success!');
                 
               }
               console.log(this.courseGroups);

               // } else {
               //   this.snotifyService.success(result.message, 'Success!');
               // }
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
        /*----------- EXAM FEE STRUCTURES -----------*/
       //  this.crudService.listByFourIds(this.getExamtimeTableDetailsUrl, this.staffForm.value.courseYearId, 
       //   this.staffForm.value.courseId, this.staffForm.value.examId,this.staffForm.value.collegeId, 'courseYearId', 'courseId', 'examId','collegeId')
       //  .subscribe(result => {
       //      this.examTimetableList = [];  
       //      this.spinner.hide();
       //      if (result.statusCode === 200){
       //              if (result.success) {
       //                  this.examTimetableList = result.data;  
       //                  for (let i = 0; i < this.examTimetableList.length; i++){
       //                      if (this.examTimetableList[i].shortName === null || this.examTimetableList[i].shortName === ''){
       //                          this.examTimetableList[i].shortName = this.examTimetableList[i].subjectCode;
       //                      } 
       //                  }
       //                  if (this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId)).length > 0){
       //                      const fromDate = this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0].from_date;
       //                      const toDate = this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0].to_date;
       //                      const dayInterval = 1000 * 60 * 60 * 24;
       //                      // const halfDayInterval = 1000 * 60 * 60 * 12;
       //                      this.dateArray = this.getBetweenDates(new Date(fromDate), new Date(toDate), dayInterval);
       //                      this.storage.setItem('dateArray', this.getBetweenDates(new Date(fromDate), new Date(toDate), dayInterval)).subscribe({
       //                          next: () => {},
       //                          error: (error) => {},
       //                      });
       //                   } 
       //                  // tslint:disable-next-line: prefer-for-of
       //                  for (let i = 0; i < this.courseGroups.length; i++){
       //                       this.courseGroups[i].dates = [];
       //                       const fromDate = this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0].from_date;
       //                       const toDate = this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0].to_date;
       //                       const dayInterval = 1000 * 60 * 60 * 24;
       //                       this.courseGroups[i].dates = this.getBetweenDates(new Date(fromDate), new Date(toDate), dayInterval);
       //                       // tslint:disable-next-line: prefer-for-of
       //                       for (let j = 0; j < this.courseGroups[i].dates.length; j++){
       //                          if (this.examTimetableList.filter(x => (x.courseGroupId === this.courseGroups[i].fk_course_group_id && 
       //                            x.examDate === this.genericFunctions.momentFormatYMD1(this.courseGroups[i].dates[j]))).length > 0){
       //                                // tslint:disable-next-line: max-line-length
       //                                this.courseGroups[i].dates[j].subjectDetails = this.examTimetableList.filter(x => (x.courseGroupId === this.courseGroups[i].fk_course_group_id && 
       //                                    x.examDate === this.genericFunctions.momentFormatYMD1(this.courseGroups[i].dates[j])));
       //                          }
       //                       }
       //                   }
       //                  this.storage.setItem('courseGroups', this.courseGroups).subscribe({
       //                      next: () => {},
       //                      error: (error) => {},
       //                  });
       //                  this.dataSource = new MatTableDataSource(this.examTimetableList);  
       //                  this.dataSource.paginator = this.paginator;
       //                  this.dataSource.sort = this.sort;
       //              } else {
       //                  if (this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId)).length > 0){
       //                      const fromDate = this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0].from_date;
       //                      const toDate = this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0].to_date;
       //                      const dayInterval = 1000 * 60 * 60 * 24;
       //                      // const halfDayInterval = 1000 * 60 * 60 * 12;
       //                      this.dateArray = this.getBetweenDates(new Date(fromDate), new Date(toDate), dayInterval);
       //                      this.storage.setItem('dateArray', this.getBetweenDates(new Date(fromDate), new Date(toDate), dayInterval)).subscribe({
       //                          next: () => {},
       //                          error: (error) => {},
       //                      });
       //                   } 
       //                  // tslint:disable-next-line: prefer-for-of
       //                  for (let i = 0; i < this.courseGroups.length; i++){
       //                       this.courseGroups[i].dates = [];
       //                       const fromDate = this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0].from_date;
       //                       const toDate = this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0].to_date;
       //                       const dayInterval = 1000 * 60 * 60 * 24;
       //                       this.courseGroups[i].dates = this.getBetweenDates(new Date(fromDate), new Date(toDate), dayInterval);
       //                       // tslint:disable-next-line: prefer-for-of
       //                       for (let j = 0; j < this.courseGroups[i].dates.length; j++){
       //                          if (this.examTimetableList.filter(x => (x.courseGroupId === this.courseGroups[i].fk_course_group_id && 
       //                            x.examDate === this.genericFunctions.momentFormatYMD1(this.courseGroups[i].dates[j]))).length > 0){
       //                                // tslint:disable-next-line: max-line-length
       //                                this.courseGroups[i].dates[j].subjectDetails = this.examTimetableList.filter(x => (x.courseGroupId === this.courseGroups[i].fk_course_group_id && 
       //                                    x.examDate === this.genericFunctions.momentFormatYMD1(this.courseGroups[i].dates[j])));
       //                          }
       //                       }
       //                   }
       //                  this.storage.setItem('courseGroups', this.courseGroups).subscribe({
       //                      next: () => {},
       //                      error: (error) => {},
       //                  });
       //                  this.dataSource = new MatTableDataSource(this.examTimetableList);  
       //                  this.dataSource.paginator = this.paginator;
       //                  this.dataSource.sort = this.sort;
       //                //  this.snotifyService.success(result.message, 'Success!');
       //              }
       //          }else {
       //            this.snotifyService.error(result.message, 'Error!');
       //        }
            
       //  }, error => {
       //     this.spinner.hide();
       //     if (error.error.statusCode === 401){
       //        this.snotifyService.error(error.error.message, 'Error!');
       //        this.genericFunctions.logOut(this.router.url);
       //    }else{
       //        this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
       //    }
       //  });
 }        
}


  getData(): void {

    /*----------- EXAM TYPES -----------*/
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examFeeType, 'true', this.generalDetailsByCodeUrl, this.isActive)
      .subscribe(result => {
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.examFeeTypes = result.data.resultList;
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

  getBetweenDates(startDate, endDate, interval): any {
    const duration = endDate - startDate;
    const steps = duration / interval;
    let array: any = [];
    this.arr = [];
    array = Array.from({ length: steps + 1 }, (v, i) => new Date(startDate.valueOf() + (interval * i)));
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < array.length; i++) {
      array[i].day = this.days[array[i].getDay()];
      // if (array[i].day !== 'SUN'){
      array[i].subjectDetails = [];
      this.arr.push(array[i]);
      // }
    }
    return this.arr;
  }

  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  addDialog(gr, grDt): void {
    gr.examDate = this.genericFunctions.momentFormatYMD1(grDt);
    gr.courseYearId = this.staffForm.value.courseYearId;
    gr.examId = this.staffForm.value.examId;
    gr.courseYearName = this.courseYear;
    gr.fromDate = this.examDetails.fromDate;
    gr.toDate = this.examDetails.toDate;
    gr.examName = this.examDetails.examName;
    gr.courseYearId = this.staffForm.value.courseYearId;
    gr.courseGroups = this.courseGroups;
    const dialogRef = this.dialog.open(AddExamTimetableComponent, {
      width: '750px',
      data: gr
    });

    dialogRef.afterClosed().subscribe(details => {
      if (details.length > 0) {
        this.spinner.show();
        this.crudService.add(this.examTimetablePostUrl, details)
          .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.success) {
                if (result.data && result.data.length > 0) {
                  this.snotifyService.info('Already same subject is exist for same year.', 'Info!');
                  this.selectedCourseYear();
                } else {
                  this.snotifyService.success(result.message, 'Success!');
                  this.selectedCourseYear();
                }
              } else {
                this.snotifyService.info(result.message, 'Info!');
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

  editDialog(row): void {
    row.courseId = this.staffForm.value.courseId;
    row.collegeId = this.staffForm.value.collegeId;

    const dialogRef = this.dialog.open(EditExamTimetablesComponent, {
      width: '750px',
      data: row
    });

    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
        // row.examLabBatchesId = details.examLabBatchesId;
        // row.examTypeCatId = details.examTypeCatId;
        // row.courseGroupId = details.courseGroupId;
        // row.examSessionId = details.examSessionId;
        // row.examDate = this.genericFunctions.momentFormatYMD1(details.examDate);
        // row.regulationId = details.regulationId;
        // row.subjectId = details.subjectId;
        // row.isActive = details.isActive;
        // row.reason = details.reason;
        // delete row.active;
        this.examTimetble = [];
      const  obj={
        eaxmLabBatchId : details.examLabBatchesId,
        examSessionId : details.examSessionId,
        examDate : this.genericFunctions.momentFormatYMD1(details.examDate),
        isActive : details.isActive,
        reason : details.reason,
        examTimetableDetId:details.examTimetableDetId,
        examTimetableLabBatchId:row.fk_exam_timetable_labbatch_id
        }
        this.examTimetble.push(obj);
        this.spinner.show();
        // this.crudService.add(this.examtimeTabledetailsByExamDateUrl, this.examTimetble)
        //   .subscribe(result => {
        //     this.spinner.hide();
        //     if (result.statusCode === 200) {
        //       if (result.success) {
        //         this.snotifyService.success(result.message, 'Success!');
        //         this.selectedCourseYear();
        //         row = null;
        //       } else {
        //         row = null;
        //         this.snotifyService.info(result.message, 'Info!');
        //       }
        //     } else {
        //       this.snotifyService.error(result.message, 'Error!');
        //     }
        //   }, error => {
        //     this.spinner.hide();
        //     if (error.error.statusCode === 401) {
        //       this.snotifyService.error(error.error.message, 'Error!');
        //       this.genericFunctions.logOut(this.router.url);
        //     } else {
        //       this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        //     }
        //   });
        this.crudService.updateDetails(this.examTimetableLabBatchesUrl, obj,row.fk_exam_timetable_labbatch_id,'examTimetableLabBatchId')
        .subscribe(result => {
            this.spinner.hide();
            if (result.success){
                this.snotifyService.success(result.message, 'Success!');
                this.selectedCourseYear();
                row = null;
            }else {
                this.snotifyService.error(result.message, 'Error!');
                row = null;

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
    });
  }

  addExamTimetable(): void {
    if (this.staffForm.value.examId !== null && this.staffForm.value.examId !== undefined) {
      this.router.navigate(['admin-examination-management/admin-exam-masters/exam-lab-timetable/add-exam-timetables'],
        {
          queryParams:
          {
            collegeId: this.staffForm.value.collegeId,
            courseId: this.staffForm.value.courseId,
            courseYearId: this.staffForm.value.courseYearId,
            academicYearId: this.staffForm.value.academicYearId,
            examId: this.staffForm.value.examId,
            courseYearName: this.courseYears.filter(x => (x.fk_course_year_id === this.staffForm.value.courseYearId))[0].course_year_code,
            // regulationFilterList :JSON.stringify( this.regulationFilterList)
          }
        });
    }

  }

  tConvert(time): any {
    if (time !== null && time !== undefined) {
      time = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];

      if (time.length > 1) { // If time format correct
        time = time.slice(1);  // Remove full string match value
        time[5] = +time[0] < 12 ? 'AM' : 'PM'; // Set AM/PM
        time[0] = +time[0] % 12 || 12; // Adjust hours
      }
      time = time[0] + time[1] + time[2] + ' ' + time[5];
      return time;
    }
  }
  checkconfilcts() {
    const dialogRef = this.dialog.open(CheckConflictsModalsComponent, {
      width: '800px',
      data: this.staffForm.value
    });
  }
}
