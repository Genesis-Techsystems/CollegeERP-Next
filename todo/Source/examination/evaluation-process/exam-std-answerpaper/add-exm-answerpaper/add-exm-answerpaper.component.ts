import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { Country } from 'app/main/models/country';
import { State } from 'app/main/models/state';
import { District } from 'app/main/models/district';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CampusModalComponent } from 'app/main/apps/admin/campus/campus-modal/campus-modal.component';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';
import { Subject, ReplaySubject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { storeMaster } from 'app/main/models/store';
import { Organization } from 'app/main/models/organization';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { NgxSpinnerService } from 'ngx-spinner';
import * as _ from 'lodash';
import { AcademicYear } from 'app/main/models/academicYear';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { ExamMaster } from 'app/main/models/examMaster';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { Section } from 'app/main/models/section';

@Component({
  selector: 'app-add-exm-answerpaper',
  templateUrl: './add-exm-answerpaper.component.html',
  styleUrls: ['./add-exm-answerpaper.component.scss']
})
export class AddExmAnswerpaperComponent implements OnInit {

  examanswerpaper: FormGroup;
  academicYears: AcademicYear[] = [];
  organizations: Organization[] = [];
  colleges: College[] = [];
  courses: Course[] = [];
  examsList: ExamMaster[] = [];
  courseGroups: CourseGroup[] = [];
  courseYears: any[] = [];
  subjectTypes: GeneralDetail[] = [];
  examTimetableSubjectsList: any[] = [];
  employees: any[] = [];
  settingValues = [];
  searchColleges = [];
  dialogTitle;
  endDate;
  startDate;
  sections: Section[] = [];
  student: any = {};
  subject: any = {};
  studentSubjects: any[] = [];
  examCourseYearSubjetsList: any[] = [];
  examSubjestList: any[] = [];
  courseYearFee: any = [];
  examsFeeStructures: any = [];
  courseYearsubjectsList: any[] = [];
  examStudentsList: any[] = [];
  searchEmployees: any[] = [];
  preStaggings: any[] = [];
  minDate;
  step = 0; 
  maxDate;
  collegeCode;
  flag:boolean
  academicYear;
  course;
  courseGroup;
  courseyear;
  section;
  date;
  subjectTypCode;
  examTypeCatCode;
  subjectDetails;
  exam;
  postMarksList: any[] = [];
  isInternalExam = false;
  examTypeId;
  regulationId;
  subjectTypeId;
  checkUploadType = 1;
  public searchText: string;
  duplicateexamStudentList = [];
  examMarkSetups: any[] = [];
  syllabusDetails = [];
  postMarksList1 = [];
  searchExams=[];

  
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private examMasterUrl = CONSTANTS.examMasterUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
  private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
  private getDetailsByCourseYearIdUrl = CONSTANTS.getDetailsByCourseYearIdUrl;
  private groupSectionCrudUrl = CONSTANTS.groupSectionCrudUrl;
  private getDetailsByGroupUrl = CONSTANTS.getDetailsByGroupUrl;
  private getDetailsByAcademicYearIdUrl = CONSTANTS.getDetailsByAcademicYearIdUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private subjectType = CONSTANTS.subjectType;
  private examIdUrl = CONSTANTS.examIdUrl;
  private subjectsforexamUrl = CONSTANTS.subjectsforexamUrl;
  private collegeByIdUrl = CONSTANTS.collegeByIdUrl;
  private courseByIdUrl = CONSTANTS.courseByIdUrl;
  private courseGroupByIdUrl = CONSTANTS.courseGroupByIdUrl;
  private courseYearByIdUrl = CONSTANTS.courseYearByIdUrl;
  private examMarksEntryStudentsUrl = CONSTANTS.examMarksEntryStudentsUrl;
  private employeeSearchUrl = CONSTANTS.employeeSearchUrl;
  private isActive = CONSTANTS.isActive;
  private sortOrder = CONSTANTS.sortOrder;
  public formData;

  public collegeFilterCtrl: FormControl = new FormControl();
  public collegeMultiCtrl: FormControl = new FormControl();
  public filteredColleges: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  public examFilterCtrl: FormControl = new FormControl();

  public employeeFilterCtrl: FormControl = new FormControl();
  public employeeSingleCtrl: FormControl = new FormControl();
  public filteredEmployees: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  public filteredExam: ReplaySubject<any[]> = new ReplaySubject<any[]>(1); 

  private _onDestroy = new Subject<void>();
  @ViewChild('singleSelect') singleSelect: MatSelect;

  constructor(private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, private dialogRef: MatDialogRef<CampusModalComponent>,
    @Inject(MAT_DIALOG_DATA) private data, private snotifyService: SnotifyService, private spinner: NgxSpinnerService,
    private crudService: CrudService, public router: Router) {
this.getData();
// this.getColleges();
}

  ngOnInit(): void {
    this.dialogTitle = 'Create Evaluator';
    this.examanswerpaper = this.formBuilder.group({
        organizationId: ['', Validators.required],
        // collegeIds: ['', Validators.required],
        // employeeId: [''],
        isnewemp: [],
        examDate: [this.genericFunctions.moment(), Validators.required],
        startDate: ['', Validators.required],
        endDate: ['', Validators.required],
        isActive: [],
        reason: [],
        courseId: ['', Validators.required],  
        collegeId: ['', Validators.required],  
        academicYearId: ['', Validators.required],  
        courseGroupId: ['', Validators.required],  
        examId: ['', Validators.required],
        examTimetableDetId: [],
        courseYearId: ['', Validators.required],
        groupSectionId: [],
        subjectTypeId: ['', Validators.required],
        subjectId: [],
        employeeId: [],
        regulationId: [],
    });

    this.examanswerpaper.get('isnewemp').setValue(true);
    this.examanswerpaper.get('isActive').setValue(true);
    this.examanswerpaper.get('reason').setValue('active');
    this.employees.push({ firstName: 'Search by employee name or empNo.' });
    this.filteredEmployees.next(this.employees.slice());
    
    this.examFilterCtrl.valueChanges
    .pipe(takeUntil(this._onDestroy))
    .subscribe(() => {
      this.filterExam();
    });
    this.searchExams.push({firstName: 'Search by Exam.'});  
    this.filteredExam.next(this.searchExams.slice()); 
    
    this.getData();
  }
  filterExam(): void {
    if (!this.searchExams) {
      return;
    }
    // get the search keyword
    let search = this.examFilterCtrl.value;
    if (!search) {
      this.filteredExam.next(this.searchExams.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the banks
    this.filteredExam.next(
     this.searchExams.filter(x => (x.examName.toLowerCase().indexOf(search) > -1))
    );
  }
getData(): void{
    /*----------- COLLEGES -----------*/
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
    .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
            if (result.data.resultList && !_.isEmpty(result.data.resultList)) {
                this.colleges = result.data.resultList;
               
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

 selectedCollege(collegeId): void{
    this.examanswerpaper.get('academicYearId').setValue('');
    this.examanswerpaper.get('courseId').setValue('');
    this.examanswerpaper.get('examId').setValue('');
    this.examanswerpaper.get('courseGroupId').setValue('');
    this.examanswerpaper.get('courseYearId').setValue('');
    this.examanswerpaper.get('subjectTypeId').setValue('');
    this.examanswerpaper.get('subjectId').setValue('');
    this.examanswerpaper.get('examTimetableDetId').setValue('');
    this.courses = [];
    this.examsList = [];
    this.courseYears = [];
    this.courseGroups = [];
    this.academicYears = []; 
    this.examTimetableSubjectsList = [];
    this.collegeCode = this.colleges.filter(x => (x.collegeId === collegeId))[0].collegeCode;
    /*----------- ACADEMIC YEARS -----------*/
    if (collegeId != null && collegeId !== undefined ){
  //  this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
  this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
   .subscribe(result => {
        if (result.statusCode === 200) {
            if (result.data.resultList && !_.isEmpty(result.data.resultList)) {
                this.academicYears = result.data.resultList;
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
  }

  selectedAcademicYear(academicYearId){
    this.examanswerpaper.get('courseId').setValue('');
    this.examanswerpaper.get('examId').setValue('');
    this.examanswerpaper.get('courseGroupId').setValue('');
    this.examanswerpaper.get('courseYearId').setValue('');
    this.examanswerpaper.get('subjectTypeId').setValue('');
    this.examanswerpaper.get('subjectId').setValue('');
    this.examanswerpaper.get('examTimetableDetId').setValue('');
    this.courses = [];
    this.examsList = [];
    this.courseGroups = []; 
    this.courseYears = [];
    this.examTimetableSubjectsList = [];
    this.academicYear = this.academicYears.filter(x => (x.academicYearId === academicYearId))[0].academicYear;
  /*----------- COURSES -----------*/
    if (academicYearId != null && academicYearId !== undefined ){
  this.crudService.listDetailsByTwoIds(this.courseCrudUrl, this.examanswerpaper.value.collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
  .subscribe(result => {
      if (result.statusCode === 200){
              if (result.data.resultList && !_.isEmpty(result.data.resultList)) {
                  this.courses = result.data.resultList; 
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
  }
  selectedCourse(courseId): void{
    this.examanswerpaper.get('courseGroupId').setValue('');
    this.examanswerpaper.get('courseYearId').setValue('');
    this.examanswerpaper.get('examId').setValue('');
    this.examanswerpaper.get('subjectTypeId').setValue('');
    this.examanswerpaper.get('subjectId').setValue('');
    this.examanswerpaper.get('examTimetableDetId').setValue('');
    this.examsList = [];
    this.courseYears = [];
    this.courseGroups = [];
    this.examTimetableSubjectsList = [];
    if (courseId !== null && courseId !== undefined){
      this.course = this.courses.filter(x => (x.courseId === courseId))[0].courseCode;
    /*----------- Exams List -----------*/      
    // tslint:disable-next-line:max-line-length
      this.crudService.listDetailsByFourIdsWithSortOrder(this.examMasterUrl, this.examanswerpaper.value.collegeId, this.examanswerpaper.value.academicYearId, courseId, 'true',
     'DESC', this.getDetailsByCollegeIdUrl , this.getDetailsByAcademicYearIdUrl, this.getDetailsByCourseIdUrl, 'isActive', 'createdDt')
      .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200){
          if (result.success) {
            this.examsList = [];
          this.examsList = result.data.resultList;
             this.searchExams = this.examsList;
            // this.examsList = [];
            // for(let i = 0; i < result.data.resultList.length; i++){
            //     if(result.data.resultList[i].isRegularExam){
            //       this.examsList.push(result.data.resultList[i]);
            //       this.searchExams.push(result.data.resultList[i]);
            //     }
            // }
                  this.filteredExam.next(this.searchExams.slice()); 
              } else {
                  this.snotifyService.success(result.message, 'Success!');
              } 
              //for(let i = 0; i < result.data.resultList.length; i++){
                // if(result.data.resultList[i].isInternalExam){
                //   this.examsList.push(result.data.resultList[i]);
                //   this.filteredExam.next(this.searchExams.slice()); 
                // }
            // }
          // }else{
          //   this.snotifyService.success(result.message, 'Success!');
          // }
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



filterEmp(): void {
  if (!this.employees) {
      return;
  }
  // get the search keyword
  let search = this.employeeFilterCtrl.value;
  if (!search) {
      this.filteredEmployees.next(this.employees.slice());
      return;
  } else {
      search = search.toLowerCase();
  }
  // filter the banks
  this.filteredEmployees.next(
      this.employees.filter(x => x.firstName.toLowerCase().indexOf(search) > -1)
  );
}

enteredStudent(event): void {
  if (event.target.value.length > 4) {
      /*----------- STUDENTS -----------*/
      this.crudService.listByIds(this.employeeSearchUrl, event.target.value, 'q')
          .subscribe(result => {
              if (result.statusCode === 200) {
                  if (result.data && result.data !== '') {
                      this.employees = result.data;
                      this.filteredEmployees.next(this.employees.slice());
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
}

selectedExam(examId): void{
    this.examanswerpaper.get('courseGroupId').setValue('');
    this.examanswerpaper.get('courseYearId').setValue('');
    this.examanswerpaper.get('subjectTypeId').setValue('');
    this.examanswerpaper.get('subjectId').setValue('');
    this.examanswerpaper.get('examTimetableDetId').setValue('');
    this.courseGroups = [];
    this.courseYears = [];
    this.examTimetableSubjectsList = [];
    this.minDate = this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === examId))[0].fromDate);
    console.log(this.minDate,"date");
    
    this.examanswerpaper.get('examDate').setValue(this.minDate);
    this.maxDate =  this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === examId))[0].toDate);
    this.isInternalExam = false;
    if (this.examsList.filter(x => (x.examId === examId)).length > 0){
        if (this.examsList.filter(x => (x.examId === examId))[0].isInternalExam){
            this.isInternalExam = true;
        }
    }
  
  /*----------- COURSES GROUPS -----------*/      
    if (examId != null && examId !== undefined ){
    this.exam = this.examsList.filter(x => (x.examId === this.examanswerpaper.value.examId))[0].examName +
     '( ' + this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === this.examanswerpaper.value.examId))[0].fromDate) + ' - ' + 
     this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === this.examanswerpaper.value.examId))[0].toDate)
       + ')';
    this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, this.examanswerpaper.value.courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200) {
            if (result.data.resultList && !_.isEmpty(result.data.resultList)) {
                this.courseGroups = result.data.resultList;
                
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
  }

  selectedCourseGroup(courseGroupId): void{
    this.courseYears = [];
    this.sections = [];
    this.examTimetableSubjectsList = [];
    this.examanswerpaper.get('courseYearId').setValue('');
    this.examanswerpaper.get('groupSectionId').setValue('');  
    this.examanswerpaper.get('subjectTypeId').setValue('');
    this.examanswerpaper.get('subjectId').setValue('');
    this.examanswerpaper.get('examTimetableDetId').setValue('');
    if (this.examanswerpaper.value.collegeId != null && courseGroupId != null){
    this.courseGroup = this.courseGroups.filter(x => (x.courseGroupId === courseGroupId))[0].groupCode;
    /*----------- COURSES Years -----------*/      
    
    this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, this.examanswerpaper.value.courseId, 'true', 'ASC',
     this.getDetailsByCourseIdUrl, this.isActive, this.sortOrder)
    .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
            if (result.data.resultList && !_.isEmpty(result.data.resultList)) {
                this.courseYears = result.data.resultList;
                
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
  
  selectedYear(courseYearId): void{
    this.sections = [];
    this.examTimetableSubjectsList = [];
    this.examanswerpaper.get('groupSectionId').setValue('');
    this.examanswerpaper.get('subjectTypeId').setValue('');
    this.examanswerpaper.get('subjectId').setValue('');
    this.examanswerpaper.get('examTimetableDetId').setValue('');
    if (this.examanswerpaper.value.collegeId != null && courseYearId != null){
    this.courseyear = this.courseYears.filter(x => (x.courseYearId === courseYearId))[0].courseYearName;
    /*----------- COURSES YEARS -----------*/      
    
    // tslint:disable-next-line:max-line-length
    this.crudService.listDetailsByFourIds(this.groupSectionCrudUrl, courseYearId, this.examanswerpaper.value.academicYearId, this.examanswerpaper.value.courseGroupId, 'true', this.getDetailsByCourseYearIdUrl, 
      this.getDetailsByAcademicYearIdUrl, this.getDetailsByGroupUrl, this.isActive)
    .subscribe(result => {
        this.spinner.hide();
        this.selectedSection();
        if (result.statusCode === 200) {
            if (result.data.resultList && !_.isEmpty(result.data.resultList)) {
                this.sections = result.data.resultList;
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
  
  selectedSection(): void{
    this.examanswerpaper.get('subjectTypeId').setValue('');
    this.examanswerpaper.get('subjectId').setValue('');
    this.examanswerpaper.get('examTimetableDetId').setValue('');
    //  this.section = this.sections.filter(x => (x.groupSectionId === groupSectionId))[0].section;
    /*----------- SUBJECT TYPE -----------*/
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.subjectType, 'true', this.generalDetailsByCodeUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                    if (result.data.resultList && !_.isEmpty(result.data.resultList)) {
                        this.subjectTypes = result.data.resultList;
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
  
  selectedSubjectType(subjectTypeId): void{
    this.examanswerpaper.get('subjectId').setValue('');
    this.examanswerpaper.get('examTimetableDetId').setValue('');
    if (subjectTypeId !== null){  
      this.examTimetableSubjectsList = [];
      const dateConvert = this.genericFunctions.momentFormatYMD(this.examanswerpaper.value.examDate);
        /*----------- EXAM TIMETABLES -----------*/
      this.crudService.listBySixIds(this.subjectsforexamUrl, this.examanswerpaper.value.collegeId, 
                                                               this.examanswerpaper.value.courseId, 
                                                               this.examanswerpaper.value.examId, 
                                                               dateConvert, 
                                                               this.examanswerpaper.value.courseGroupId, 
                                                               this.examanswerpaper.value.courseYearId, 
  
                                                               this.collegeByIdUrl, this.courseByIdUrl, this.examIdUrl, 'examDate', this.courseGroupByIdUrl, this.courseYearByIdUrl)
        .subscribe(result => {
            if (result.statusCode === 200){
                    if (result.data && !_.isEmpty(result.data) && result.data.length > 0) {
                     // this.examTimetableSubjectsList = result.data;
                       if (subjectTypeId !== 0){
                        this.examTimetableSubjectsList = result.data.filter(x => (x.subjectTypeId === subjectTypeId));
                        // this.subjectTypCode = this.subjectTypes.filter(x => (x.generalDetailId === subjectTypeId))[0].generalDetailCode;
                       }
                       else if (subjectTypeId === 0){
                        this.examTimetableSubjectsList = result.data;
                      // this.subjectTypCode = 'All';
                       }
                      //  this.getMarksSetup(result.data);
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
  }

isEmptyObject(obj) {
  return (obj && (Object.keys(obj).length === 0));
}

submit(): void {
  const Obj = this.examanswerpaper.value;
  for (let i = 0; i < this.collegeMultiCtrl.value.length; i++) {

      if (i === 0) {
          Obj.collegeIds = this.collegeMultiCtrl.value[i];
      } else {
          Obj.collegeIds = Obj.collegeIds + ',' + this.collegeMultiCtrl.value[i];
      }
  }
  Obj.employeeId = this.employeeSingleCtrl.value;
  if (this.examanswerpaper.invalid) {
      return;
  } else {
      this.dialogRef.close(Obj);
  }
}

}
