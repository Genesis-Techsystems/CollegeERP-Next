import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router, ActivatedRoute } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { AcademicYear } from 'app/main/models/academicYear';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { ExamMaster } from 'app/main/models/examMaster';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { Section } from 'app/main/models/section';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { ReplaySubject, Subject } from 'rxjs';
import { MarksEditModalComponent } from '../internal-marks-entry/marks-edit-modal/marks-edit-modal.component';
import * as _ from 'lodash';

@Component({
  selector: 'app-mid-marks-entry',
  templateUrl: './mid-marks-entry.component.html',
  styleUrls: ['./mid-marks-entry.component.scss']
})
export class MidMarksEntryComponent implements OnInit {

  displayedColumns: string[] = ['id', 'campusCode', 'campusName', 'orgCode', 'districtName'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  @ViewChild('uploadXl') uploadXl: ElementRef;

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
  private getDetailsByRegulationIdUrl = CONSTANTS.getDetailsByRegulationIdUrl;
  private examStudentInternalMarksUrl = CONSTANTS.examStudentInternalMarksUrl;
  private subjectsforexamUrl = CONSTANTS.subjectsforexamUrl;
  private collegeByIdUrl = CONSTANTS.collegeByIdUrl;
  private courseByIdUrl = CONSTANTS.courseByIdUrl;
  private courseGroupByIdUrl = CONSTANTS.courseGroupByIdUrl;
  private courseYearByIdUrl = CONSTANTS.courseYearByIdUrl;
  private examMarksEntryStudentsUrl = CONSTANTS.examMarksEntryStudentsUrl;
  private isActive = CONSTANTS.isActive;
  private examMarksSetupUrl = CONSTANTS.examMarksSetupUrl;
  private examFCARStudentSubMarkUrl = CONSTANTS.examFCARStudentSubMarkUrl;
  private examFCARStudentSubMarkCrudUrl = CONSTANTS.examFCARStudentSubMarkCrudUrl;
  private examFCARSubjectSyllabusCrudUrl = CONSTANTS.examFCARSubjectSyllabusCrudUrl;
  private examStudentInternalMarkCrudUrl = CONSTANTS.examStudentInternalMarkCrudUrl;
  private sortOrder = CONSTANTS.sortOrder;
  public formData;

  examFeeCollectionForm: FormGroup;
  colleges: College[] = [];
  academicYears: AcademicYear[] = [];
  courses: Course[] = [];
  examsList: ExamMaster[] = [];
  courseGroups: CourseGroup[] = [];
  sections: Section[] = [];
  student: any = {};
  subject: any = {};
  studentSubjects: any[] = [];
  courseYears: any[] = [];
  examCourseYearSubjetsList: any[] = [];
  examSubjestList: any[] = [];
  courseYearFee: any = [];
  examsFeeStructures: any = [];
  courseYearsubjectsList: any[] = [];
  subjectTypes: GeneralDetail[] = [];
  examTimetableSubjectsList: any[] = [];
  examStudentsList: any[] = [];
  searchEmployees: any[] = [];
  preStaggings: any[] = [];
  minDate;
  maxDate;
  collegeCode;
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
  examData = [];
  
  examDate = this.genericFunctions.momentWithDateFormatYMD(this.genericFunctions.moment()) ;

  public employeeFilterCtrl: FormControl = new FormControl();
  public filteredEmployees: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  private _onDestroy = new Subject<void>();

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute) {        
      this.getData();
  }

  ngOnInit(): void {
    this.examFeeCollectionForm = this.formBuilder.group({
      courseId: ['', Validators.required],  
      collegeId: ['', Validators.required],  
      academicYearId: ['', Validators.required],  
      courseGroupId: ['', Validators.required],  
      examId: ['', Validators.required],
      examTimetableDetId: [],
      examDate: [this.genericFunctions.moment(), Validators.required],
      courseYearId: ['', Validators.required],
      groupSectionId: [],
      subjectTypeId: ['', Validators.required],
      subjectId: [],
      employeeId: [],
      regulationId: [],
      fDate: [this.genericFunctions.moment()],
    });
   
    this.dataSource = new MatTableDataSource(this.examSubjestList); 
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.searchEmployees.push({firstName: 'Search by Employee name or Id.'});
    this.filteredEmployees.next(this.searchEmployees.slice());

  }

   // tslint:disable-next-line: use-lifecycle-interface
   ngOnDestroy(): void {
  }

  filterEmp(): void {
    if (!this.searchEmployees) {
    return;
    }
    // get the search keyword
    let search = this.employeeFilterCtrl.value;
    if (!search) {
    this.filteredEmployees.next(this.searchEmployees.slice());
    return;
    } else {
    search = search.toLowerCase();
    }
    // filter the banks
    this.filteredEmployees.next(
    // this.searchEmployeess.filter(x => x.firstName.toLowerCase().indexOf(search) > -1)
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
    this.examFeeCollectionForm.get('academicYearId').setValue('');
    this.examFeeCollectionForm.get('courseId').setValue('');
    this.examFeeCollectionForm.get('examId').setValue('');
    this.examFeeCollectionForm.get('courseGroupId').setValue('');
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('subjectTypeId').setValue('');
    this.examFeeCollectionForm.get('subjectId').setValue('');
    this.examFeeCollectionForm.get('examTimetableDetId').setValue('');
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

// tslint:disable-next-line:typedef
selectedAcademicYear(academicYearId){
  this.examFeeCollectionForm.get('courseId').setValue('');
  this.examFeeCollectionForm.get('examId').setValue('');
  this.examFeeCollectionForm.get('courseGroupId').setValue('');
  this.examFeeCollectionForm.get('courseYearId').setValue('');
  this.examFeeCollectionForm.get('subjectTypeId').setValue('');
  this.examFeeCollectionForm.get('subjectId').setValue('');
  this.examFeeCollectionForm.get('examTimetableDetId').setValue('');
  this.courses = [];
  this.examsList = [];
  this.courseGroups = []; 
  this.courseYears = [];
  this.examTimetableSubjectsList = [];
  this.academicYear = this.academicYears.filter(x => (x.academicYearId === academicYearId))[0].academicYear;
/*----------- COURSES -----------*/
  if (academicYearId != null && academicYearId !== undefined ){
this.crudService.listDetailsByTwoIds(this.courseCrudUrl, this.examFeeCollectionForm.value.collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
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
  this.examFeeCollectionForm.get('courseGroupId').setValue('');
  this.examFeeCollectionForm.get('courseYearId').setValue('');
  this.examFeeCollectionForm.get('examId').setValue('');
  this.examFeeCollectionForm.get('subjectTypeId').setValue('');
  this.examFeeCollectionForm.get('subjectId').setValue('');
  this.examFeeCollectionForm.get('examTimetableDetId').setValue('');
  this.examsList = [];
  this.courseYears = [];
  this.courseGroups = [];
  this.examTimetableSubjectsList = [];
  if (courseId !== null && courseId !== undefined){
    this.course = this.courses.filter(x => (x.courseId === courseId))[0].courseCode;
  /*----------- Exams List -----------*/      
  // tslint:disable-next-line:max-line-length
    this.crudService.listDetailsByFourIdsWithSortOrder(this.examMasterUrl, this.examFeeCollectionForm.value.collegeId, this.examFeeCollectionForm.value.academicYearId, courseId, 'true',
   'DESC', this.getDetailsByCollegeIdUrl , this.getDetailsByAcademicYearIdUrl, this.getDetailsByCourseIdUrl, 'isActive', 'createdDt')
    .subscribe(result => {
    this.spinner.hide();
    if (result.statusCode === 200){
        if (result.success) {
          this.examsList = [];
          for(let i = 0; i < result.data.resultList.length; i++){
              if(result.data.resultList[i].isInternalExam){
                this.examsList.push(result.data.resultList[i]);
                this.examData.push(result.data.resultList[i]);
              }
          }
        }else{
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
searchExam(value) {
  this.examData = [];
  this.examSearch(value);
}
examSearch(value: string) {
  let filter = value.toLowerCase()
  for (let i = 0; i < this.examsList.length; i++) {
      let option = this.examsList[i];
      if (option.examName.toLowerCase().indexOf(filter) >= 0) {
          this.examData.push(option);
      }
  }
}
selectedExam(examId): void{
  this.examFeeCollectionForm.get('courseGroupId').setValue('');
  this.examFeeCollectionForm.get('courseYearId').setValue('');
  this.examFeeCollectionForm.get('subjectTypeId').setValue('');
  this.examFeeCollectionForm.get('subjectId').setValue('');
  this.examFeeCollectionForm.get('examTimetableDetId').setValue('');
  this.courseGroups = [];
  this.courseYears = [];
  this.examTimetableSubjectsList = [];
  this.minDate = this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === examId))[0].fromDate);
  this.examFeeCollectionForm.get('examDate').setValue(this.minDate);
  this.maxDate =  this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === examId))[0].toDate);
  this.isInternalExam = false;
  if (this.examsList.filter(x => (x.examId === examId)).length > 0){
      if (this.examsList.filter(x => (x.examId === examId))[0].isInternalExam){
          this.isInternalExam = true;
      }
  }

/*----------- COURSES GROUPS -----------*/      
  if (examId != null && examId !== undefined ){
  this.exam = this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].examName +
   '( ' + this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].fromDate) + ' - ' + 
   this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].toDate)
     + ')';
  this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, this.examFeeCollectionForm.value.courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
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
  this.examFeeCollectionForm.get('courseYearId').setValue('');
  this.examFeeCollectionForm.get('groupSectionId').setValue('');  
  this.examFeeCollectionForm.get('subjectTypeId').setValue('');
  this.examFeeCollectionForm.get('subjectId').setValue('');
  this.examFeeCollectionForm.get('examTimetableDetId').setValue('');
  if (this.examFeeCollectionForm.value.collegeId != null && courseGroupId != null){
  this.courseGroup = this.courseGroups.filter(x => (x.courseGroupId === courseGroupId))[0].groupCode;
  /*----------- COURSES Years -----------*/      
  
  this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, this.examFeeCollectionForm.value.courseId, 'true', 'ASC',
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
  this.examFeeCollectionForm.get('groupSectionId').setValue('');
  this.examFeeCollectionForm.get('subjectTypeId').setValue('');
  this.examFeeCollectionForm.get('subjectId').setValue('');
  this.examFeeCollectionForm.get('examTimetableDetId').setValue('');
  if (this.examFeeCollectionForm.value.collegeId != null && courseYearId != null){
  this.courseyear = this.courseYears.filter(x => (x.courseYearId === courseYearId))[0].courseYearName;
  /*----------- COURSES YEARS -----------*/      
  
  // tslint:disable-next-line:max-line-length
  this.crudService.listDetailsByFourIds(this.groupSectionCrudUrl, courseYearId, this.examFeeCollectionForm.value.academicYearId, this.examFeeCollectionForm.value.courseGroupId, 'true', this.getDetailsByCourseYearIdUrl, 
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
  this.examFeeCollectionForm.get('subjectTypeId').setValue('');
  this.examFeeCollectionForm.get('subjectId').setValue('');
  this.examFeeCollectionForm.get('examTimetableDetId').setValue('');
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
  this.examFeeCollectionForm.get('subjectId').setValue('');
  this.examFeeCollectionForm.get('examTimetableDetId').setValue('');
  if (subjectTypeId !== null){  
    this.examTimetableSubjectsList = [];
    const dateConvert = this.genericFunctions.momentFormatYMD(this.examFeeCollectionForm.value.examDate);
      /*----------- EXAM TIMETABLES -----------*/
    this.crudService.listBySixIds(this.subjectsforexamUrl, this.examFeeCollectionForm.value.collegeId, 
                                                             this.examFeeCollectionForm.value.courseId, 
                                                             this.examFeeCollectionForm.value.examId, 
                                                             dateConvert, 
                                                             this.examFeeCollectionForm.value.courseGroupId, 
                                                             this.examFeeCollectionForm.value.courseYearId, 

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
                     this.getMarksSetup(result.data);
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

getMarksSetup(data): void{
  if (data.length > 0){
    this.crudService.listDetailsByThreeIds(this.examMarksSetupUrl, data[0].courseId, data[0].regulationId, 'true',
    this.getDetailsByCourseIdUrl, this.getDetailsByRegulationIdUrl, 'isActive')
    .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
            if (result.data.resultList && !_.isEmpty(result.data.resultList)) {
                this.examMarkSetups = result.data.resultList;
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

selectedSubject(examTimetableDetId, list): void{
  this.examStudentsList = [];
  if (examTimetableDetId !== null){
    this.subjectDetails = '';
    const dateConvert = this.genericFunctions.momentFormatYMD(this.examFeeCollectionForm.value.examDate);
    this.subjectDetails =  this.examTimetableSubjectsList.filter(x => (x.examTimetableDetId === examTimetableDetId))[0].subjectName + ' (' +
    this.examTimetableSubjectsList.filter(x => (x.examTimetableDetId === examTimetableDetId))[0].regulationCode + ')';

    if (this.examTimetableSubjectsList.filter(x => (x.examTimetableDetId === this.examFeeCollectionForm.value.examTimetableDetId)).length > 0){
          this.examTypeId = this.examTimetableSubjectsList.filter(x => (x.examTimetableDetId === this.examFeeCollectionForm.value.examTimetableDetId))[0].examTypeCatId;
          // tslint:disable-next-line: max-line-length
          this.examFeeCollectionForm.get('subjectId').setValue(this.examTimetableSubjectsList.filter(x => (x.examTimetableDetId === this.examFeeCollectionForm.value.examTimetableDetId))[0].subjectId);
          this.regulationId = this.examTimetableSubjectsList.filter(x => (x.examTimetableDetId === this.examFeeCollectionForm.value.examTimetableDetId))[0].regulationId;
          this.subjectTypeId = this.examTimetableSubjectsList.filter(x => (x.examTimetableDetId === this.examFeeCollectionForm.value.examTimetableDetId))[0].subjectTypeId;
          this.subjectTypCode = this.examTimetableSubjectsList.filter(x => (x.examTimetableDetId === this.examFeeCollectionForm.value.examTimetableDetId))[0].subjectTypeName;
          this.examTypeCatCode = this.examTimetableSubjectsList.filter(x => (x.examTimetableDetId === this.examFeeCollectionForm.value.examTimetableDetId))[0].examTypeCatCode;
      }

    
      /*----------- EXAM TIMETABLES -----------*/
    this.crudService.listByEightIds(this.examMarksEntryStudentsUrl, this.examFeeCollectionForm.value.collegeId, 
        this.examFeeCollectionForm.value.courseId, 
        this.examFeeCollectionForm.value.examId, 
        dateConvert, 
        this.examFeeCollectionForm.value.courseGroupId, 
        this.examFeeCollectionForm.value.courseYearId, 
        this.examFeeCollectionForm.value.subjectId, 
        this.examTypeId,
        this.collegeByIdUrl, this.courseByIdUrl, this.examIdUrl, 'examDate', this.courseGroupByIdUrl, this.courseYearByIdUrl, 'subjectId', 'examTypeId')
        .subscribe(result => {
          if (result.statusCode === 200){
                  if (result.data && !_.isEmpty(result.data) && result.data.length > 0) {
                    // console.log([...new Set(result.data)]);
                    
                    this.examStudentsList = [...new Map(result.data.map(item =>
                      [item['rollNumber'], item])).values()]
                    
                    // this.examStudentsList = result.data;
                    this.getSubjectSyllabus(this.examFeeCollectionForm.value.subjectId);
                    // tslint:disable-next-line: prefer-for-of
                    // for (let i = 0; i < this.examStudentsList.length; i++){
                    //   if (this.examStudentsList[i].marks === null){
                    //       this.examStudentsList[i].marks = 0;
                    //   }
                    //   if (this.examStudentsList[i].isPresent === false){
                    //       this.examStudentsList[i].isPass = false;
                    //   }
                    //   this.enteredMarks(this.examStudentsList[i]);
                    // }

                   

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

    getSubjectSyllabus(subjectId):void{
      this.crudService.listDetailsByThreeIds(this.examFCARSubjectSyllabusCrudUrl, this.examFeeCollectionForm.value.examId, 'true',
      this.examFeeCollectionForm.value.subjectId,
      'examMaster.examId', this.isActive, 'subject.subjectId')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
              if (result.data && !_.isEmpty(result.data)) {
                  this.syllabusDetails = result.data.resultList;
                  for (let i = 0; i < this.examStudentsList.length; i++){
                      this.examStudentsList[i].mids = [];
                      this.examStudentsList[i].total = 0;
                      this.examStudentsList[i].isPresent = true;
                      for (let j = 0; j < this.syllabusDetails.length; j++){
                        this.examStudentsList[i].mids.push({
                            examFCARSetDetId: this.syllabusDetails[j].examFCARSetDetId,
                            examFCARSubSyllabusId: this.syllabusDetails[j].examFCARSubSyllabusId,
                            detailCode: this.syllabusDetails[j].detailCode,
                            courseOutcomeCatdetCode: this.syllabusDetails[j].courseOutcomeCatdetCode,
                            subjectId: this.syllabusDetails[j].subjectId,
                            marks: '',
                        });
                      }
                  }
                  this.getMarks();
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

    getMarks(): void{
      if (this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId)).length > 0){
        if (this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].isInternalExam){
            this.crudService.listDetailsByThreeIds(this.examFCARStudentSubMarkCrudUrl, this.examFeeCollectionForm.value.collegeId,
              this.examFeeCollectionForm.value.examId,
              this.examFeeCollectionForm.value.subjectId, 
              'college.collegeId', 'examMaster.examId', 'subject.subjectId')
            .subscribe(result1 => {
                if (result1.statusCode === 200){
                        if (result1.data.resultList && !_.isEmpty( result1.data.resultList) && result1.data.resultList.length > 0) {
                           // tslint:disable-next-line: prefer-for-of
                           for (let i = 0; i < result1.data.resultList.length; i++){
                                if (this.examStudentsList.filter(x => (x.studentId === result1.data.resultList[i].studentId)).length > 0){

                                  
                                    
                                   if (this.examStudentsList.filter(x => (x.studentId === result1.data.resultList[i].studentId))[0].mids.filter(y => (y.examFCARSetDetId === result1.data.resultList[i].examFCARSetDetId)).length >0){

                                   // tslint:disable-next-line: max-line-length
                                   this.examStudentsList.filter(x => (x.studentId === result1.data.resultList[i].studentId))[0].mids.filter(y => (y.examFCARSetDetId === result1.data.resultList[i].examFCARSetDetId))[0].marks = result1.data.resultList[i].marks;
                                   this.examStudentsList.filter(x => (x.studentId === result1.data.resultList[i].studentId))[0].mids.filter(y => (y.examFCARSetDetId === result1.data.resultList[i].examFCARSetDetId))[0].createdDt = result1.data.resultList[i].createdDt;
                                   this.examStudentsList.filter(x => (x.studentId === result1.data.resultList[i].studentId))[0].mids.filter(y => (y.examFCARSetDetId === result1.data.resultList[i].examFCARSetDetId))[0].createdUser = result1.data.resultList[i].createdUser;
                                   // tslint:disable-next-line: max-line-length
                                   this.examStudentsList.filter(x => (x.studentId === result1.data.resultList[i].studentId))[0].mids.filter(y => (y.examFCARSetDetId === result1.data.resultList[i].examFCARSetDetId))[0].examStdSubMarkId = result1.data.resultList[i].examStdSubMarkId;
                                  }
                                  
                                  }
                                  
                           }
                           this.getInternalMarks();
                        } else {
                            // tslint:disable-next-line: prefer-for-of
                           
                           // this.snotifyService.success(result1.message, 'Success!');
                        }
                        this.duplicateexamStudentList = this.examStudentsList;
                }else {
                      this.snotifyService.error(result1.message, 'Error!');
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
        this.duplicateexamStudentList = this.examStudentsList;
      }
    }

    getInternalMarks(): void{
      this.crudService.listDetailsByThreeIds(this.examStudentInternalMarkCrudUrl, this.examFeeCollectionForm.value.collegeId,
        this.examFeeCollectionForm.value.examId,
        this.examFeeCollectionForm.value.subjectId, 
        'college.collegeId', 'examMaster.examId', 'subject.subjectId')
      .subscribe(result1 => {
          if (result1.statusCode === 200){
                  if (result1.data.resultList && !_.isEmpty( result1.data.resultList)) {
                     // tslint:disable-next-line: prefer-for-of
                     for (let i = 0; i < result1.data.resultList.length; i++){
                          if (this.examStudentsList.filter(x => (x.studentId === result1.data.resultList[i].studentId)).length > 0){
                        
                             // tslint:disable-next-line: max-line-length
                             this.examStudentsList.filter(x => (x.studentId === result1.data.resultList[i].studentId))[0].examStdInternalMarkId = result1.data.resultList[i].examStdInternalMarkId;
                          }
                          console.log("file: mid-marks-entry.component.ts:728 ~ MidMarksEntryComponent ~ getInternalMarks ~ this.examStudentsList[i]:", this.examStudentsList[i])
                          this.examStudentsList[i] && this.enteredAmount1(this.examStudentsList[i]);
                     }
                  } else {
                    for (let i = 0; i < this.examStudentsList.length; i++){
                      console.log("file: mid-marks-entry.component.ts:733 ~ MidMarksEntryComponent ~ getInternalMarks ~ this.examStudentsList[i]:", this.examStudentsList[i])
                      this.enteredAmount1(this.examStudentsList[i]);
                    }
                  }
          }else {
                this.snotifyService.error(result1.message, 'Error!');
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

    calDays(): void{
      this.courseYears = [];
      this.sections = [];
      this.examFeeCollectionForm.get('courseGroupId').setValue('');
      this.examFeeCollectionForm.get('courseYearId').setValue('');
      this.examFeeCollectionForm.get('groupSectionId').setValue('');
      this.examFeeCollectionForm.get('subjectTypeId').setValue('');
      this.examFeeCollectionForm.get('subjectId').setValue('');
      this.searchEmployees = [];
      this.examStudentsList = [];
      // this.searchEmployees.push({firstName: 'Search by Employee name or Id.'});
      // this.filteredEmployees.next(this.searchEmployees.slice());
      this.examDate = this.genericFunctions.momentWithDateFormatYMD(this.examFeeCollectionForm.value.examDate); // new Date(this.data.issueTodate);
    }

    enteredMarks(item): void{
       if (this.examMarkSetups.filter(x => (x.subjectTypeCatId === item.subjecttypeId)).length > 0){
          if (item.examTypeCode === 'Internal'){
                item.isPass = true;  
          }else{
            // tslint:disable-next-line:max-line-length
            if ((this.examMarkSetups.filter(x => (x.subjectTypeCatId === item.subjecttypeId))[0].externalMarks * this.examMarkSetups.filter(x => (x.subjectTypeCatId === item.subjecttypeId))[0].externalPassPercentage) / 100 > item.marks){
                item.isPass = false;
            }else{
                item.isPass = true;
            }  
          }
       }
    }

    enteredAmount1(item): void{
      let marksList = [];
      let marksListDup = [];
      item.total = 0;
      for (let i = 0; i < item.mids.length; i++){
         if ((item.mids[i].detailCode != 'Quiz') && (item.mids[i].detailCode != 'Assignment')){
          if (item.mids[i].marks != null && item.mids[i].marks != ''){
             marksList.push(item.mids[i]);
          }
         }else{
             marksListDup.push(item.mids[i]);
         }
      }
      for (let i = 0; i < this.sortOrderByMarks(marksList).length; i++){
         if (i < 3){
              item.total = item.total + marksList[i].marks;
         }
      }
      for (let i = 0; i < marksListDup.length; i++){
          item.total = item.total + marksListDup[i].marks;
      }
    }

    enteredAmount(item, mid): void{
     
      if (mid.marks <= this.getMaxMarks(mid)){
      let marksList = [];
      let marksListDup = [];
      item.total = 0;
      for (let i = 0; i < item.mids.length; i++){
         if ((item.mids[i].detailCode != 'Quiz') && (item.mids[i].detailCode != 'Assignment')){
          if (item.mids[i].marks != null && item.mids[i].marks != ''){
             marksList.push(item.mids[i]);
          }
         }else{
             marksListDup.push(item.mids[i]);
         }
      }
      for (let i = 0; i < this.sortOrderByMarks(marksList).length; i++){
         if (i < 3){
              item.total = item.total + marksList[i].marks;
         }
      }
      for (let i = 0; i < marksListDup.length; i++){
          item.total = item.total + marksListDup[i].marks;
      }
    }else{
      mid.marks = '';
      this.snotifyService.info('Marks should not exceed than max marks.', 'Info!');
    }
    }

    getMaxMarks(detailCode): any{
       if (this.syllabusDetails.filter(x => (x.detailCode === detailCode)).length > 0){
            return this.syllabusDetails.filter(x => (x.detailCode === detailCode))[0].marks;
       }
    }

    sortOrderByMarks(data): any {
      return data.sort((a, b) => {
        return b.marks-a.marks;
      });
    }

    postExamMarks(): void{
      if (this.examFeeCollectionForm.valid){
        this.postMarksList = [];
        if (this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId)).length > 0){
              // tslint:disable-next-line: prefer-for-of
              for (let i = 0; i < this.examStudentsList.length; i++){
                for (let j = 0; j < this.examStudentsList[i].mids.length; j++){
                  let examStdSubMarkId;
                  let createdDt;
                  let createdUser;
                  if (this.examStudentsList[i].mids[j].examStdSubMarkId){
                    examStdSubMarkId = this.examStudentsList[i].mids[j].examStdSubMarkId;
                    createdDt = this.examStudentsList[i].mids[j].createdDt;
                    createdUser = this.examStudentsList[i].mids[j].createdUser;
                  }else{
                    examStdSubMarkId = null;
                    createdDt = null;
                    createdUser = null;
                  }
                  this.postMarksList.push({
                    "examStdSubMarkId": examStdSubMarkId,
                    "examFCARSubjectSyllabusId": this.examStudentsList[i].mids[j].examFCARSubSyllabusId,
                    "createdDt": createdDt,
                    "createdUser": createdUser,
                    "examDate": this.examFeeCollectionForm.value.examDate,
                    "collegeId": this.examFeeCollectionForm.value.collegeId,
                    "courseYearId": this.examFeeCollectionForm.value.courseYearId,
                    "examId": this.examFeeCollectionForm.value.examId,
                    "examTimetableDetId": this.examFeeCollectionForm.value.examTimetableDetId,
                    "examTimetableId": this.examTimetableSubjectsList.filter(x => (x.examTimetableDetId === this.examFeeCollectionForm.value.examTimetableDetId))[0].examTimetableId,
                    "reviewerId": null,
                    "studentId": this.examStudentsList[i].studentId,
                    "subjectId": this.examFeeCollectionForm.value.subjectId,
                    "isActive": true,
                    "isPresent": null,
                    "marks": this.examStudentsList[i].mids[j].marks,
                    "reason": +this.examStudentsList[i].total,
                    "reviewComments": null,
                    "total": this.examStudentsList[i].total,
                    "reviewedOn": null,
                    "examFCARSetDetId": this.examStudentsList[i].mids[j].examFCARSetDetId,
                  });
                }
              }
              this.spinner.show();
              /*---------- EXAM SUBJECT SYLLABUS MARKS ----------*/
              this.crudService.add(this.examFCARStudentSubMarkUrl, this.postMarksList)
              .subscribe(result => {
                  this.spinner.hide();
                  if (result.success){
                        this.snotifyService.success(result.message, 'Success!');
                        // if (result.data){
                        //   this.selectedSubject(this.examFeeCollectionForm.value.examTimetableDetId, result.data);
                        // }else{
                          this.save();
                          
                       // }
                  }else {
                      this.snotifyService.info(result.message, 'Info!');
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
    }

    save(): void{
      this.postMarksList1 = [];
      for (let i = 0; i < this.examStudentsList.length; i++){
        this.examStudentsList[i].marksEnteredEmpId = this.examFeeCollectionForm.value.employeeId;
        this.examStudentsList[i].courseId = this.examFeeCollectionForm.value.courseId;
        this.examStudentsList[i].regulationId = this.regulationId;
        this.examStudentsList[i].subjectTypeId = this.subjectTypeId;
        
        this.postMarksList1.push({
            examStudentDetailDTO: this.examStudentsList[i],
            examStudentInternalMarkDTO: {
              examDate: this.examFeeCollectionForm.value.examDate,
              isActive: true,
              isPresent: this.examStudentsList[i].isPresent,
              isPublished: false,
              marks: this.examStudentsList[i].total,
              collegeId: this.examFeeCollectionForm.value.collegeId,
              studentId: this.examStudentsList[i].studentId,
              courseYearId: this.examFeeCollectionForm.value.courseYearId,
              subjectId: this.examFeeCollectionForm.value.subjectId,
              examId: this.examFeeCollectionForm.value.examId,
              // tslint:disable-next-line: max-line-length
              examTimetableId: this.examTimetableSubjectsList.filter(x => (x.examTimetableDetId === this.examFeeCollectionForm.value.examTimetableDetId))[0].examTimetableId,
              examTimetableDetId: this.examFeeCollectionForm.value.examTimetableDetId,
              employeeId: this.examFeeCollectionForm.value.employeeId,
              createdDt: this.genericFunctions.moment(),
              examStdInternalMarkId: this.examStudentsList[i].examStdInternalMarkId,
            }
        });
    }
    this.spinner.show();
    /*---------- EXAM INTERNAL MARKS ----------*/
    this.crudService.add(this.examStudentInternalMarksUrl, this.postMarksList1)
    .subscribe(result => {
        this.spinner.hide();
        if (result.success){
              // this.snotifyService.success(result.message, 'Success!');
              this.selectedSubject(this.examFeeCollectionForm.value.examTimetableDetId, []);
        }else {
          this.selectedSubject(this.examFeeCollectionForm.value.examTimetableDetId, []);
            this.snotifyService.info(result.message, 'Info!');
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
