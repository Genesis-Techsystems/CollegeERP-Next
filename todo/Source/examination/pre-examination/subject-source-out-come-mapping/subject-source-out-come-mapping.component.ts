import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
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

@Component({
  selector: 'app-subject-source-out-come-mapping',
  templateUrl: './subject-source-out-come-mapping.component.html',
  styleUrls: ['./subject-source-out-come-mapping.component.scss']
})
export class SubjectSourceOutComeMappingComponent implements OnInit {

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
  private isActive = CONSTANTS.isActive;
  private examFCARSetupDetailCrudUrl = CONSTANTS.examFCARSetupDetailCrudUrl;
  private subjectRegulationCrudUrl = CONSTANTS.subjectRegulationCrudUrl;
  private examFCARSubjectSyllabusUrl = CONSTANTS.examFCARSubjectSyllabusUrl;
  private examFCARSubjectSyllabusCrudUrl = CONSTANTS.examFCARSubjectSyllabusCrudUrl;
  private getSubjectBooks = CONSTANTS.getSubjectBooks;
  private getSubjectUnitUrl = CONSTANTS.getSubjectUnitUrl;
  private outcome = CONSTANTS.outcome;
  private sortOrder = CONSTANTS.sortOrder;
  private examFCARSetupMasterCrudUrl = CONSTANTS.examFCARSetupMasterCrudUrl;

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
  examsMarksSteupList: any[] = [];
  outcomes: GeneralDetail[] = [];
  preStaggings: any[] = [];
  collegeCode;
  academicYear;
  course;
  courseGroup;
  courseyear;
  section;
  subjectDetails;
  exam;
  subjects = [];
  units = [];
  json = [];
  syllabusDetails = [];
  examsMarksSteups = [];
  examData = [];
  subjectData = [];

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
      courseYearId: ['', Validators.required],
      groupSectionId: [],
      examFCARSetMasterId: [],
      subjectId: [],
    });
  }

  getData(): void{
    this.spinner.show()
     /*----------- COLLEGES -----------*/
     this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
     .subscribe(result => {
         this.spinner.hide();
         this.generalDetail();
         if (result.statusCode === 200){
             if (result.data.resultList && result.data.resultList !== '') {
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

  generalDetail(): void{
    /*----------- COURSE OUTCOME -----------*/
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.outcome, 'true', this.generalDetailsByCodeUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.outcomes = result.data.resultList;
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

  selectedCollege(collegeId): void{
    this.examFeeCollectionForm.get('academicYearId').setValue('');
    this.examFeeCollectionForm.get('courseId').setValue('');
    this.examFeeCollectionForm.get('examId').setValue('');
    this.examFeeCollectionForm.get('courseGroupId').setValue('');
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('subjectId').setValue('');
    this.examsMarksSteups = []
    this.units = []
    this.courses = [];
    this.examsList = [];
    this.courseYears = [];
    this.courseGroups = [];
    this.academicYears = []; 
    this.collegeCode = this.colleges.filter(x => (x.collegeId === collegeId))[0].collegeCode;
    /*----------- ACADEMIC YEARS -----------*/
    if (collegeId != null && collegeId !== undefined ){
  //  this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
  this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
   .subscribe(result => {
        if (result.statusCode === 200) {
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

    
  }
  }

// tslint:disable-next-line:typedef
selectedAcademicYear(academicYearId){
  this.examFeeCollectionForm.get('courseId').setValue('');
  this.examFeeCollectionForm.get('examId').setValue('');
  this.examFeeCollectionForm.get('courseGroupId').setValue('');
  this.examFeeCollectionForm.get('courseYearId').setValue('');
  this.examFeeCollectionForm.get('subjectId').setValue('');
  this.courses = [];
  this.examsList = [];
  this.courseGroups = []; 
  this.courseYears = [];
  this.examsMarksSteups = []
  this.units = []
  this.academicYear = this.academicYears.filter(x => (x.academicYearId === academicYearId))[0].academicYear;
/*----------- COURSES -----------*/
  if (academicYearId != null && academicYearId !== undefined ){
this.crudService.listDetailsByTwoIds(this.courseCrudUrl, this.examFeeCollectionForm.value.collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
.subscribe(result => {
    if (result.statusCode === 200){
            if (result.data.resultList && result.data.resultList !== '') {
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
  this.examFeeCollectionForm.get('subjectId').setValue('');
  this.examsList = [];
  this.courseYears = [];
  this.examsMarksSteups = []
  this.units = []
  this.courseGroups = [];
  if (courseId !== null && courseId !== undefined){
    this.course = this.courses.filter(x => (x.courseId === courseId))[0].courseCode;
    this.getSetMaster();
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
searchExam(value){
  this.examData = [];
  this.search(value)
}
search(value:string){
    let filter = value.toLowerCase();
    for(let i = 0 ; i < this.examsList.length;i++){
      let option = this.examsList[i];
      if(option.examName.toLowerCase().indexOf(filter)>=0){
        this.examData.push(option)
      }
    }
}
  
getSetMaster(): void{
  this.crudService.listDetailsByTwoIds(this.examFCARSetupMasterCrudUrl, this.examFeeCollectionForm.value.collegeId, this.examFeeCollectionForm.value.courseId,
    this.getDetailsByCollegeIdUrl , this.getDetailsByCourseIdUrl)
.subscribe(result => {
   this.spinner.hide();
   if (result.statusCode === 200){
        if (result.data && result.data !== '') {
            this.examsMarksSteups = result.data.resultList;
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

selectedExam(examId): void{
  this.examFeeCollectionForm.get('courseGroupId').setValue('');
  this.examFeeCollectionForm.get('courseYearId').setValue('');
  this.examFeeCollectionForm.get('subjectId').setValue('');
  this.courseGroups = [];
  this.courseYears = [];
  this.units = []

/*----------- COURSES GROUPS -----------*/      
  if (examId != null && examId !== undefined ){
  this.exam = this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].examName +
   '( ' + this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].fromDate) + ' - ' + 
   this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.examId === this.examFeeCollectionForm.value.examId))[0].toDate)
     + ')';
  this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, this.examFeeCollectionForm.value.courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
  .subscribe(result => {
      if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
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
  this.units = []
  this.examFeeCollectionForm.get('courseYearId').setValue('');
  this.examFeeCollectionForm.get('groupSectionId').setValue('');  
  this.examFeeCollectionForm.get('subjectId').setValue('');
  if (this.examFeeCollectionForm.value.collegeId != null && courseGroupId != null){
  this.courseGroup = this.courseGroups.filter(x => (x.courseGroupId === courseGroupId))[0].groupCode;
  /*----------- COURSES Years -----------*/      
  
  this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, this.examFeeCollectionForm.value.courseId, 'true', 'ASC',
   this.getDetailsByCourseIdUrl, this.isActive, this.sortOrder)
  .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
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
  this.units = []
  this.examFeeCollectionForm.get('groupSectionId').setValue('');
  this.examFeeCollectionForm.get('subjectId').setValue('');
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
          if (result.data.resultList && result.data.resultList !== []) {
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
  this.units = [];
  this.examFeeCollectionForm.get('subjectId').setValue('')
  /*----------- SUBJECTS -----------*/
  this.crudService.listDetailsByFourIds(this.subjectRegulationCrudUrl, 
    this.examFeeCollectionForm.value.courseGroupId, this.examFeeCollectionForm.value.courseYearId, this.examFeeCollectionForm.value.academicYearId, 'true', 
    'CourseGroup.courseGroupId', 'CourseYear.courseYearId', 'AcademicYear.academicYearId', this.isActive)
  .subscribe(result => {
      if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.subjects = result.data.resultList;
                      this.subjectData = result.data.resultList;
                      // for (){

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
searchSubject(value){
  this.subjectData = []
  this.searchSub(value)
}
searchSub(value:string){
  let filter = value.toLowerCase();
  for(let i = 0;this.subjects.length;i++){
    let option = this.subjects[i];
    if(option.subjectName.toLowerCase().indexOf(filter) >= 0){
      this.subjectData.push(option)
    }
  }
}

selectedSubject(subjectId): void{
  this.units = [];
  let subjectRegulationId = this.subjects.filter(x => (x.subjectId == subjectId))[0].subjectRegulationId;
  this.getSubjectSyllabus();
  this.crudService.listDetailsByThreeIds(this.examFCARSetupDetailCrudUrl, this.examFeeCollectionForm.value.collegeId, 'true', this.examFeeCollectionForm.value.examFCARSetMasterId,
      this.getDetailsByCollegeIdUrl, this.isActive, 'ExamFCARSetupMaster.examFCARSetMasterId')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
              if (result.data && result.data !== '') {
                  this.examsMarksSteupList = result.data.resultList;
                  for (let i = 0; i < this.examsMarksSteupList.length; i++){
                    this.examsMarksSteupList[i].courseOutcomeCatdetId = '';
                    this.examsMarksSteupList[i].subjectUnitsId = '';
                  }
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
  this.crudService.listDetailsByTwoIds(this.getSubjectUnitUrl, subjectRegulationId, 'true', this.getSubjectBooks, 'isActive')
  .subscribe(result => {
      if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
              this.units = result.data.resultList;
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

selectedSub(): void{
  this.examFeeCollectionForm.get('examFCARSetMasterId').setValue('');
  this.units = []
}

getSubjectSyllabus(): void{
  this.crudService.listDetailsByTwoIds(this.examFCARSubjectSyllabusCrudUrl, this.examFeeCollectionForm.value.collegeId, 'true',
  this.getDetailsByCollegeIdUrl, this.isActive)
  .subscribe(result => {
    this.spinner.hide();
    if (result.statusCode === 200){
          if (result.data && result.data !== '') {
              this.syllabusDetails = result.data.resultList;
              for (let i = 0; i < this.examsMarksSteupList.length; i++){
                 if (this.syllabusDetails.filter(x => (x.examFCARSetDetId == this.examsMarksSteupList[i].examFCARSetDetId && 
                                                       x.subjectId == this.examFeeCollectionForm.value.subjectId && 
                                                       x.examId == this.examFeeCollectionForm.value.examId &&
                                                       x.courseGroupId == this.examFeeCollectionForm.value.courseGroupId &&
                                                       x.courseYearId == this.examFeeCollectionForm.value.courseYearId &&
                                                       x.groupSectionId == this.examFeeCollectionForm.value.groupSectionId)).length > 0){
                                                        this.examsMarksSteupList[i].examFCARSubSyllabusId = this.syllabusDetails.filter(x => (x.examFCARSetDetId == this.examsMarksSteupList[i].examFCARSetDetId && 
                                                          x.subjectId == this.examFeeCollectionForm.value.subjectId && 
                                                          x.examId == this.examFeeCollectionForm.value.examId &&
                                                          x.courseGroupId == this.examFeeCollectionForm.value.courseGroupId &&
                                                          x.courseYearId == this.examFeeCollectionForm.value.courseYearId &&
                                                          x.groupSectionId == this.examFeeCollectionForm.value.groupSectionId))[0].examFCARSubSyllabusId;
                                                          this.examsMarksSteupList[i].subjectUnitsId = this.syllabusDetails.filter(x => (x.examFCARSetDetId == this.examsMarksSteupList[i].examFCARSetDetId && 
                                                            x.subjectId == this.examFeeCollectionForm.value.subjectId && 
                                                            x.examId == this.examFeeCollectionForm.value.examId &&
                                                            x.courseGroupId == this.examFeeCollectionForm.value.courseGroupId &&
                                                            x.courseYearId == this.examFeeCollectionForm.value.courseYearId &&
                                                            x.groupSectionId == this.examFeeCollectionForm.value.groupSectionId))[0].subjectUnitsId;
                                                            this.examsMarksSteupList[i].courseOutcomeCatdetId = this.syllabusDetails.filter(x => (x.examFCARSetDetId == this.examsMarksSteupList[i].examFCARSetDetId && 
                                                              x.subjectId == this.examFeeCollectionForm.value.subjectId && 
                                                              x.examId == this.examFeeCollectionForm.value.examId &&
                                                              x.courseGroupId == this.examFeeCollectionForm.value.courseGroupId &&
                                                              x.courseYearId == this.examFeeCollectionForm.value.courseYearId &&
                                                              x.groupSectionId == this.examFeeCollectionForm.value.groupSectionId))[0].courseOutcomeCatdetId;
                                                              this.examsMarksSteupList[i].createdUser = this.syllabusDetails.filter(x => (x.examFCARSetDetId == this.examsMarksSteupList[i].examFCARSetDetId && 
                                                                x.subjectId == this.examFeeCollectionForm.value.subjectId && 
                                                                x.examId == this.examFeeCollectionForm.value.examId &&
                                                                x.courseGroupId == this.examFeeCollectionForm.value.courseGroupId &&
                                                                x.courseYearId == this.examFeeCollectionForm.value.courseYearId &&
                                                                x.groupSectionId == this.examFeeCollectionForm.value.groupSectionId))[0].createdUser;
                                                                this.examsMarksSteupList[i].createdDt = this.syllabusDetails.filter(x => (x.examFCARSetDetId == this.examsMarksSteupList[i].examFCARSetDetId && 
                                                                  x.subjectId == this.examFeeCollectionForm.value.subjectId && 
                                                                  x.examId == this.examFeeCollectionForm.value.examId &&
                                                                  x.courseGroupId == this.examFeeCollectionForm.value.courseGroupId &&
                                                                  x.courseYearId == this.examFeeCollectionForm.value.courseYearId &&
                                                                  x.groupSectionId == this.examFeeCollectionForm.value.groupSectionId))[0].createdDt;
                 }
              }
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

save(): void{
  this.spinner.show();
  this.json = [];

  for (let i = 0; i < this.examsMarksSteupList.length; i++){
    let createdUser;
    let createdDt;
    let examFCARSubSyllabusId;
    if (this.examsMarksSteupList[i].examFCARSubSyllabusId){
      examFCARSubSyllabusId = this.examsMarksSteupList[i].examFCARSubSyllabusId;
      createdUser = this.examsMarksSteupList[i].createdUser;
      createdDt = this.examsMarksSteupList[i].createdDt;
    }else{
      examFCARSubSyllabusId = null;
      createdUser = null;
      createdDt = null;
    }
    this.json.push({
        "examFCARSubSyllabusId": examFCARSubSyllabusId,
        "createdUser": createdUser,
        "createdDt": createdDt,
        "configuredOn": new Date(),
        "collegeId": this.examFeeCollectionForm.value.collegeId,
        "configempId": +localStorage.getItem('employeeId'),
        "examFCARSetDetId": this.examsMarksSteupList[i].examFCARSetDetId,
        "courseYearId": this.examFeeCollectionForm.value.courseYearId,
        "courseGroupId": this.examFeeCollectionForm.value.courseGroupId,
        "groupSectionId": this.examFeeCollectionForm.value.groupSectionId,
        "examId": this.examFeeCollectionForm.value.examId,
        "subUnitTopicIds": null,
        "subjectUnitsId": this.examsMarksSteupList[i].subjectUnitsId,
        "courseOutcomeCatdetId": this.examsMarksSteupList[i].courseOutcomeCatdetId,
        "subjectId": this.examFeeCollectionForm.value.subjectId,
        "isActive": true
    })
  }  
      
              /*---------- EXAM Regular MARKS ----------*/
              this.crudService.add(this.examFCARSubjectSyllabusUrl, this.json)
              .subscribe(result => {
                  this.spinner.hide();
                  if (result.success){
                        this.snotifyService.success(result.message, 'Success!');
                        this.getSubjectSyllabus();
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

    calDays(): void{
      this.courseYears = [];
      this.sections = [];
      this.examFeeCollectionForm.get('courseGroupId').setValue('');
      this.examFeeCollectionForm.get('courseYearId').setValue('');
      this.examFeeCollectionForm.get('groupSectionId').setValue('');
      this.examFeeCollectionForm.get('subjectId').setValue('');
     
    }

}
