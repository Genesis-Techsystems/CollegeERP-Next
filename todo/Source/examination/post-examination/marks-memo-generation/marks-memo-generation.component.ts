import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { AcademicYear } from 'app/main/models/academicYear';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { ExamMaster } from 'app/main/models/examMaster';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { fuseAnimations } from '@fuse/animations';

@Component({
  selector: 'app-marks-memo-generation',
  templateUrl: './marks-memo-generation.component.html',
  styleUrls: ['./marks-memo-generation.component.scss'],
  animations : fuseAnimations
})

export class MarksMemoGenerationComponent implements OnInit {

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private examMasterUrl = CONSTANTS.examMasterUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
  private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
  private getDetailsByAcademicYearIdUrl = CONSTANTS.getDetailsByAcademicYearIdUrl;
  private isActive = CONSTANTS.isActive;
  private examMemoDataPopUrl = CONSTANTS.examMemoDataPopUrl;
  private sortOrder = CONSTANTS.sortOrder;

  examFeeCollectionForm: FormGroup;
  colleges: College[] = [];
  academicYears: AcademicYear[] = [];
  courses: Course[] = [];
  examsList: ExamMaster[] = [];
  courseGroups: CourseGroup[] = [];
  courseYears: any[] = [];
  collegeCode;
  academicYear;
  course;
  courseGroup;
  courseyear;
  exam;
  examData = [];

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
      courseGroupId: [0],  
      examId: ['', Validators.required],
      courseYearId: [0],
    });

  }

  getData(): void{
     /*----------- COLLEGES -----------*/
     this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
     .subscribe(result => {
         this.spinner.hide();
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

  selectedCollege(collegeId): void{
    this.examFeeCollectionForm.get('academicYearId').setValue('');
    this.examFeeCollectionForm.get('courseId').setValue('');
    this.examFeeCollectionForm.get('examId').setValue('');
    this.examFeeCollectionForm.get('courseGroupId').setValue(0);
    this.examFeeCollectionForm.get('courseYearId').setValue(0);
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
  this.examFeeCollectionForm.get('courseGroupId').setValue(0);
  this.examFeeCollectionForm.get('courseYearId').setValue(0);
  this.courses = [];
  this.examsList = [];
  this.courseGroups = []; 
  this.courseYears = [];
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
  this.examFeeCollectionForm.get('courseGroupId').setValue(0);
  this.examFeeCollectionForm.get('courseYearId').setValue(0);
  this.examFeeCollectionForm.get('examId').setValue('');
  this.examsList = [];
  this.courseYears = [];
  this.courseGroups = [];
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
            // tslint:disable-next-line: prefer-for-of
            for (let i = 0; i < result.data.resultList.length; i++){
              if (!result.data.resultList[i].isInternalExam){
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
  this.examFeeCollectionForm.get('courseGroupId').setValue(0);
  this.examFeeCollectionForm.get('courseYearId').setValue(0);
  this.courseGroups = [];

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
  this.examFeeCollectionForm.get('courseYearId').setValue(0);  
  if (this.examFeeCollectionForm.value.collegeId != null && courseGroupId != null){
  this.courseGroup = this.courseGroups.filter(x => (x.courseGroupId === courseGroupId))[0].groupCode;

}
}

  generateMemo(): void{
     if (this.examFeeCollectionForm.valid){
         this.spinner.show();
         // tslint:disable-next-line:max-line-length
         this.crudService.listByFourIds(this.examMemoDataPopUrl, this.examFeeCollectionForm.value.examId, this.examFeeCollectionForm.value.courseYearId, this.examFeeCollectionForm.value.courseGroupId, 0,
        'in_exam_id', 'in_course_year_id', 'in_course_group_id', 'in_student_id' )
          .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200){
                if (result.success) {
                    
                }else {
                  this.snotifyService.success('Memo Generated Successfully.', 'Success!');
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

}
