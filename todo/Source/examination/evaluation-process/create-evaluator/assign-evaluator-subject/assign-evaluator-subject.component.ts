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
  selector: 'app-assign-evaluator-subject',
  templateUrl: './assign-evaluator-subject.component.html',
  styleUrls: ['./assign-evaluator-subject.component.scss']
})
export class AssignEvaluatorSubjectComponent implements OnInit {

  assignsubjectform: FormGroup;
  event:any;
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
  courseCode;
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
  duplicateCourseGroups: any[] = [];
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
  examDetails: any = {};
  examTimetableList: any[] = [];
  Obj: any={};

 
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
  private examtTimetableDetailsUrl = CONSTANTS.examtTimetableDetailsUrl;
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
  subjectCode: any;
  subjectId: any;
    subjectsdetails: any;

  constructor(private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, private dialogRef: MatDialogRef<CampusModalComponent>,
    @Inject(MAT_DIALOG_DATA) private data, private snotifyService: SnotifyService, private spinner: NgxSpinnerService,
    private crudService: CrudService, public router: Router) {

}
// examTimetableDetId;
// subjectId;
// subjectCode;
// validityStartDate;
// validityEndDate;
// isActive;
// reason;


  ngOnInit(): void {
    this.assignsubjectform = this.formBuilder.group({
      collegeId:['',Validators.required],
      courseId:['',Validators.required],
      academicYearId:['',Validators.required],
      examId:['',Validators.required],
      courseYearId:['',Validators.required],
      examTimetableDetId:['',Validators.required],
      validityStartDate:['',Validators.required],
      validityEndDate:['',Validators.required],
      isActive:[],
      reason:[],
      subjectCode:[''],
      subjectId:['']
    });
    this.assignsubjectform.get('isActive').setValue(true);
    this.getData();
  }
  getData(): void{
    /*----------- COLLEGES -----------*/
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
    .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
            if (result.data.resultList && !_.isEmpty(result.data.resultList)) {
                this.colleges = result.data.resultList;
                 this.selectedCollege(this.assignsubjectform.value.collegeId)
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
  this.collegeCode = this.colleges.filter(x => (x.collegeId === collegeId))[0].collegeCode;
  
  this.assignsubjectform.get('courseId').setValue('');
  this.courses = [];
  if (collegeId !== null && collegeId !== ''){
      /*----------- COURSES -----------*/
      this.crudService.listDetailsByTwoIds(this.courseCrudUrl, collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
      .subscribe(result => {
          if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.courses = result.data.resultList;
                     
                          this.assignsubjectform.get('courseId').setValue(+localStorage.getItem('courseId'));
                          this.data =  this.data + ' / ' + this.courses.filter(x => (x.courseId === this.assignsubjectform.value.courseId))[0].courseCode;
                           this.selectedCourse(this.assignsubjectform.value.courseId); 
                       
                             
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
  if (courseId != null){
      this.courseCode = this.courses.filter(x => (x.courseId === courseId))[0].courseCode;
  
      this.assignsubjectform.get('courseYearId').setValue('');
      this.courseYears = [];

           /*----------- ACADEMIC YEARS -----------*/
    //  this.crudService.listDetailsByTwoIds(this.academicYearCrudUrl, this.staffForm.value.collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
      // tslint:disable-next-line: max-line-length
      this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl,  this.assignsubjectform.value.collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
      .subscribe(result => {
          if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
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
            /*----------- COURSE GROUPS -----------*/
      this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
              .subscribe(result => {
                  if (result.statusCode === 200) {
                      if (result.data.resultList && result.data.resultList !== '') {
                       //   this.courseGroups = result.data.resultList;
                          this.duplicateCourseGroups = result.data.resultList;

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

             /*----------- COURSE YEARS -----------*/
      this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, courseId, 'true', 'ASC',
              this.getDetailsByCourseIdUrl, this.isActive, this.sortOrder)
             .subscribe(result => {
                 if (result.statusCode === 200){
                         if (result.data.resultList && result.data.resultList !== '') {
                            this.courseYears = result.data.resultList;
                            
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

selectedAcademicYear(academicYearId): void{
  this.academicYear =  this.academicYears.filter(x => (x.academicYearId === this.assignsubjectform.value.academicYearId))[0].academicYear;
  this.examsList = [];
  this.assignsubjectform.get('examId').setValue('');
  
  this.assignsubjectform.get('courseYearId').setValue('');
  if (academicYearId){
      // this.crudService.listDetailsByFourIds(this.examMasterUrl, this.staffForm.value.collegeId, this.staffForm.value.courseId, academicYearId, 'true',
      //     this.getDetailsByCollegeIdUrl, this.getDetailsByCourseIdUrl, 'AcademicYear.academicYearId', this.isActive)
          // tslint:disable-next-line: max-line-length
          this.crudService.listDetailsByFourIdsWithSortOrder(this.examMasterUrl, this.assignsubjectform.value.collegeId, this.assignsubjectform.value.courseId, academicYearId, 'true', 
      'DESC', this.getDetailsByCollegeIdUrl, this.getDetailsByCourseIdUrl, this.getDetailsByAcademicYearIdUrl, this.isActive , 'createdDt')
      .subscribe(result => {
         this.spinner.hide();
         if (result.statusCode === 200){
              if (result.success) {
                  this.examsList = result.data.resultList;
             
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

selectedExam(): void{
  this.examDetails =  this.examsList.filter(x => (x.examId === this.assignsubjectform.value.examId))[0];
  this.assignsubjectform.get('courseYearId').setValue('');
  this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, this.assignsubjectform.value.courseId, 'true', 'ASC',
  this.getDetailsByCourseIdUrl, this.isActive, this.sortOrder)
 .subscribe(result => {
     if (result.statusCode === 200){
             if (result.data.resultList && result.data.resultList !== '') {
                 this.courseYears = result.data.resultList;
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
selectedCourseYear(courseYearId): void{
  
  this.examTimetableList = [];  
  this.examDetails =  this.examsList.filter(x => (x.examId === this.assignsubjectform.value.examId))[0];
  this.courseGroups = [];
  this.courseGroups = this.duplicateCourseGroups ;
  if ( courseYearId != null ){
      this.spinner.show();
      /*----------- EXAM FEE STRUCTURES -----------*/
      this.crudService.listByThreeIds(this.examtTimetableDetailsUrl, this.assignsubjectform.value.courseYearId, 
       this.assignsubjectform.value.courseId, this.assignsubjectform.value.examId, 'courseYearId', 'courseId', 'examId')
      .subscribe(result => {
          this.examTimetableList = [];  
          this.spinner.hide();
          if (result.statusCode === 200){
                  if (result.success) {
                      this.examTimetableList = result.data;  
                    console.log(this.examTimetableList,"subjects");
                    
                    //  this.snotifyService.success(result.message, 'Success!');
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



isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  

submit(){

let sub = this.assignsubjectform.value.examTimetableDetId
for(let i=0;i<this.examTimetableList.length;i++){
    if(sub == this.examTimetableList[i].examTimetableDetId){
        this.assignsubjectform.get('subjectId').setValue( this.examTimetableList[i].subjectId),
        this.assignsubjectform.get('subjectCode').setValue( this.examTimetableList[i].subjectCode)  
    }
 }


if(this.assignsubjectform.valid){
    this.Obj.examEvaluatorProfileId = this.data.examEvaluatorProfileId;
    this.Obj.examTimetableDetId = this.assignsubjectform.value.examTimetableDetId;
    this.Obj.subjectId = this.assignsubjectform.value.subjectId;
    this.Obj.subjectCode = this.assignsubjectform.value.subjectCode;
    this.Obj.validityStartDate = this.assignsubjectform.value.validityStartDate;
    this.Obj.validityEndDate = this.assignsubjectform.value.validityEndDate;
    this.Obj.isActive = this.assignsubjectform.value.isActive;
    this.Obj.reason = this.assignsubjectform.value.reason;
}


    // this.Obj.collegeId=this.assignsubjectform.value.collegeId;
    // this.Obj.evaluatorEmpId=this.assignsubjectform.value.evaluatorEmpId;
    // this.Obj.roleId=this.assignsubjectform.value.roleId;
    // this.Obj.titleId=this.assignsubjectform.value.titleId;
    // this.Obj.evaluatorName=this.assignsubjectform.value.evaluatorName;
    // this.Obj.phoneNumber=this.assignsubjectform.value.phoneNumber;
    // this.Obj.alternatephoneNumber=this.assignsubjectform.value.alternatephoneNumber;
    // this.Obj.email=this.assignsubjectform.value.email;
    // this.Obj.aadhar=this.assignsubjectform.value.aadhar;
    // this.Obj.isActive=this.assignsubjectform.value.isActive;
    // this.Obj.reason=this.assignsubjectform.value.reason;
    // console.log(this.Obj);
    //this.dialogRef.close(this.Obj);
console.log(this.Obj);

}

}

