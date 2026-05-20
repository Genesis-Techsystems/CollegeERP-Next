import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { AcademicYear } from 'app/main/models/academicYear';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { ExamMaster } from 'app/main/models/examMaster';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { Regulations } from 'app/main/models/Rregulations';
import { Subject, ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-internal-exams-avg',
  templateUrl: './internal-exams-avg.component.html',
  styleUrls: ['./internal-exams-avg.component.scss'],
  providers: [DatePipe]
})

export class InternalExamsAvgComponent implements OnInit {

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private getDetailsByUniversityIdUrl = CONSTANTS.getDetailsByUniversityIdUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private finalInternalMarksListUrl = CONSTANTS.finalInternalMarksListUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
  private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private subjectType = CONSTANTS.subjectType;
  private examStudentUrl = CONSTANTS.examStudentUrl;
  private internalExamMarksType = CONSTANTS.internalExamMarksType;
  private finalInternalMarksUrl = CONSTANTS.finalInternalMarksUrl;
  private regulationCrudUrl = CONSTANTS.regulationCrudUrl;
  private isActive = CONSTANTS.isActive;
  private sortOrder = CONSTANTS.sortOrder;
  dateFormate = CONSTANTS.dateFormate;

  internalMarksCalForm: FormGroup;
  colleges: College[] = [];
  academicYears: AcademicYear[] = [];
  courses: Course[] = [];
  examsList: any[] = [];
  courseGroups: CourseGroup[] = [];
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
  selectedExamslist: any[] = [];
  regulations: any[] = [];
  marksCalTypes = CONSTANTS.examMarksCalType; 
  searchExams = [];
  subRegulations: any[] = [];
  searchSubjects = [];
  finalInternalMarks = [];
  midExamMarks = [];
  examIntMarks = [];
  tempV: any;
  selectedData: any;


  collegeCode;
  academicYear;
  course;
  courseGroup;
  courseyear;
  regulation;
  date;
  subjectTypCode;
  subjectDetails;
  examcalType;
  postMarksList: any[] = [];
  flag = false;
  examTypeId;
  internalExamTypes: GeneralDetail[] = [];
  keys = [];
  stdSubjects = [];
  duplicateKeys = [];
  intExams = [];
  examNames = [];
  regulationId;
  examIntMarkTypeId;
  regulationCode;
  internalType;
  universityId;

  public examsMultiCtrl: FormControl = new FormControl();
  public examsFilterCtrl: FormControl = new FormControl();
  public filteredExamsList: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  public subjectsFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredSubjects: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  finalMidExamMarks=[];

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,
              private datePipe: DatePipe) {        
      this.getData();
  }

  ngOnInit(): void {
    this.internalMarksCalForm = this.formBuilder.group({
      courseId: ['', Validators.required],  
      collegeId: ['', Validators.required],  
      academicYearId: ['', Validators.required],  
      courseGroupId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      markcalTypeId: ['', Validators.required],
    });

    this.internalMarksCalForm.get('markcalTypeId').disable();
    this.subjectsFilterCtrl.valueChanges
    .pipe(takeUntil(this._onDestroy))
    .subscribe(() => {
      this.filterSub();
    });

  }

  filterSub(): void {
    if (!this.searchSubjects) {
      return;
    }
    // get the search keyword
    let search = this.subjectsFilterCtrl.value;
    if (!search) {
      this.filteredSubjects.next(this.searchSubjects.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the banks
    this.filteredSubjects.next(
      // this.searchSubjects.filter(x => x.subjectName.toLowerCase().indexOf(search) > -1)
      // tslint:disable-next-line: max-line-length
      this.searchSubjects.filter(x => ((x.subjectName != null && x.subjectName.toLowerCase().indexOf(search) > -1) || (x.subjectCode != null && x.subjectCode.toLowerCase().indexOf(search) > -1)))
    );
  }

   // tslint:disable-next-line: use-lifecycle-interface
   ngOnDestroy(): void {
   }

  getData(): void{
      /*----------- COLLEGES -----------*/
     this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
     .subscribe(result => {
         this.spinner.hide();
         this.generalDetails();
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

  generalDetails(): void{
       /*----------- SUBJECT TYPES -----------*/
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.subjectType, 'true', this.generalDetailsByCodeUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                    if (result.data.resultList && result.data.resultList !== '') {
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

    /*----------- INTERNAL EXAM TYPE -----------*/
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.internalExamMarksType, 'true', this.generalDetailsByCodeUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.internalExamTypes = result.data.resultList;
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
    this.internalMarksCalForm.get('academicYearId').setValue('');
    this.internalMarksCalForm.get('courseId').setValue('');
    this.internalMarksCalForm.get('courseGroupId').setValue('');
    this.internalMarksCalForm.get('courseYearId').setValue('');
    this.courses = [];
    this.examsList = [];
    this.courseYears = [];
    this.courseGroups = [];
    this.academicYears = []; 
    this.midExamMarks = [];
    this.examTimetableSubjectsList = [];
    this.collegeCode = this.colleges.filter(x => (x.collegeId === collegeId))[0].collegeCode;
      /*----------- COURSES -----------*/
    if (collegeId != null && collegeId !== undefined ){
      this.universityId = this.colleges.filter(x=>(x.collegeId === collegeId))[0]?.universityId;
      this.crudService.listDetailsByTwoIds(this.courseCrudUrl, this.universityId, 'true', this.getDetailsByUniversityIdUrl, this.isActive)
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

      // tslint:disable-next-line:max-line-length
      this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, this.universityId, 'true', 'DESC', this.getDetailsByUniversityIdUrl, this.isActive, 'fromDate')
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

  selectedCourse(courseId): void{
    this.internalMarksCalForm.get('courseGroupId').setValue('');
    this.internalMarksCalForm.get('courseYearId').setValue('');
    this.courseYears = [];
    this.courseGroups = []; 
    this.examsList = []; 
    this.midExamMarks = [];
    this.examTimetableSubjectsList = [];
    this.internalMarksCalForm.get('markcalTypeId').setValue('');
    this.searchExams = []; 
    this.selectedExamslist = []; 
    this.examNames = [];
    this.examsMultiCtrl.setValue([]);
    this.flag = false;
    if (courseId !== null && courseId !== undefined){
      this.course = this.courses.filter(x => (x.courseId === courseId))[0].courseCode;
      this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, this.internalMarksCalForm.value.courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
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
    this.midExamMarks = [];
    this.examsList = []; 
    this.examTimetableSubjectsList = [];
    this.internalMarksCalForm.get('courseYearId').setValue('');
    this.internalMarksCalForm.get('markcalTypeId').setValue('');
    this.searchExams = []; 
    this.selectedExamslist = []; 
    this.examNames = [];
    this.examsMultiCtrl.setValue([]);
    this.flag = false;
    if (this.internalMarksCalForm.value.collegeId != null && courseGroupId != null){
    this.courseGroup = this.courseGroups.filter(x => (x.courseGroupId === courseGroupId))[0].groupCode;
    /*----------- COURSES Years -----------*/  
    
    this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, this.internalMarksCalForm.value.courseId, 'true', 'ASC',
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
    this.internalMarksCalForm.get('markcalTypeId').setValue('');
    this.searchExams = []; 
    this.selectedExamslist = []; 
    this.examNames = [];
    this.examsMultiCtrl.setValue([]);
    this.flag = false;
    this.examTimetableSubjectsList = []; 
    this.midExamMarks = [];
    if (this.internalMarksCalForm.value.collegeId != null && courseYearId != null){
      this.courseyear = this.courseYears.filter(x => (x.courseYearId === courseYearId))[0].courseYearName;
    }
    this.selectedAcademicYear(this.internalMarksCalForm.value.academicYearId);
  }
  selectedAYear(): void{
    this.internalMarksCalForm.get('courseGroupId').setValue('');
    this.internalMarksCalForm.get('courseYearId').setValue('');
    this.internalMarksCalForm.get('courseId').setValue('');
    this.internalMarksCalForm.get('markcalTypeId').setValue('');
    this.courseYears = [];
    this.courseGroups = []; 
    this.examsList = []; 
    this.searchExams = []; 
    this.midExamMarks = [];
    this.examTimetableSubjectsList = [];
    this.selectedExamslist = []; 
    this.examNames = [];
    this.examsMultiCtrl.setValue([]);
    this.flag = false;
  }
  // tslint:disable-next-line:typedef
  selectedAcademicYear(academicYearId){
    this.examsList = []; 
    this.midExamMarks = [];
    this.examTimetableSubjectsList = [];
    this.academicYear = this.academicYears.filter(x => (x.academicYearId === academicYearId))[0].academicYear;
    if (academicYearId != null){
   /*----------- Exams List -----------*/         
      this.crudService.listDetailsBySevenIdsOrderBy(this.examStudentUrl, 
                                             this.internalMarksCalForm.value.collegeId, 
                                             this.internalMarksCalForm.value.courseId, 
                                             this.internalMarksCalForm.value.academicYearId,
                                             this.internalMarksCalForm.value.courseGroupId,
                                             this.internalMarksCalForm.value.courseYearId, 
                                             'Internal',
                                             'true',
                                             'DESC',
                                             this.getDetailsByCollegeIdUrl, 
                                             'examMaster.course.courseId', 
                                             'examMaster.academicYear.academicYearId',
                                             'studentDetail.courseGroup.courseGroupId',
                                             'courseYear.courseYearId',
                                             'examtypeCat.generalDetailCode',
                                             'isActive',
                                             'createdDt')
      .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200){
          if (result.success && result.data.resultList.length > 0) {
            // tslint:disable-next-line: prefer-for-of
            for (let i = 0; i < result.data.resultList.length; i++){
               if (this.examsList.filter(x => (x.examId === result.data.resultList[i].examId)).length === 0){
                  this.examsList.push(result.data.resultList[i]);
               }
            }
            this.searchExams = this.examsList;
            this.filteredExamsList.next(this.searchExams.slice());
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

  selectedExamsList(): void{
    this.selectedExamslist = []; 
    this.examNames = [];
    this.flag = true;
    this.midExamMarks = [];
    if (this.examsMultiCtrl.value != null){
      const examsIds = this.examsMultiCtrl.value;
      // tslint:disable-next-line: prefer-for-of
      for (let i = 0; i < examsIds.length; i++) {
                this.selectedExamslist.push (this.examsList.filter(x => ( x.examId === examsIds[i]))[0]);
                this.regulationId = this.examsList.filter(x => ( x.examId === examsIds[i]))[0].examStudentDetailDTOs[0].regulationId;
                this.regulationCode = this.examsList.filter(x => ( x.examId === examsIds[i]))[0].examStudentDetailDTOs[0].regulationName;
                if (this.examsList.filter(x => ( x.examId === examsIds[i]))[0].examShortName != null){
                  this.examNames.push(this.examsList.filter(x => ( x.examId === examsIds[i]))[0].examShortName);
                } else{
                  this.examNames.push(this.examsList.filter(x => ( x.examId === examsIds[i]))[0].examName);
                }
              }
      this.getRegulation(this.regulationId);
      this.examNames.push('Final');
    }
  }

  getRegulation(regulationId): void{
    this.crudService.listDetailsById(this.regulationCrudUrl, regulationId, 'regulationId')
    .subscribe(result => {
       this.spinner.hide();
       if (result.statusCode === 200){
            if (result.data && result.data !== '') {
                this.regulations = result.data.resultList;
                if (this.regulations.length > 0){
                    this.examIntMarkTypeId = this.regulations[0].examIntMarkTypeId;
                    this.internalMarksCalForm.get('markcalTypeId').setValue(this.regulations[0].examIntMarkTypeId);
                    if (this.internalExamTypes.filter(x => (x.generalDetailId === this.examIntMarkTypeId)).length > 0){
                        this.internalType = this.internalExamTypes.filter(x => (x.generalDetailId === this.examIntMarkTypeId))[0].generalDetailDisplayName;
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

  selectedMarksCalType(markcalTypeId): void{
    this.midExamMarks = [];
  }

  getList(): void{
    if (this.internalMarksCalForm.valid){
        this.spinner.show();
        this.keys = [];
        
        this.stdSubjects = [];
        this.intExams = [];
        this.midExamMarks = [];
        this.selectedData = this.colleges.filter(x => (x.collegeId === this.internalMarksCalForm.value.collegeId))[0].collegeCode;
        this.selectedData = this.selectedData + ' / ' + this.academicYears.filter(x => (x.academicYearId === this.internalMarksCalForm.value.academicYearId))[0].academicYear;
        this.selectedData = this.selectedData + ' / ' + this.courses.filter(x => (x.courseId === this.internalMarksCalForm.value.courseId))[0].courseCode;
        this. selectedData = this.selectedData + ' / ' + this.courseGroups.filter(x => (x.courseGroupId === this.internalMarksCalForm.value.courseGroupId))[0].groupCode;
        this.selectedData = this.selectedData + ' / ' + this.courseYears.filter(x => (x.courseYearId === this.internalMarksCalForm.value.courseYearId))[0].courseYearName;
       
        for (let index = 0; index <  this.selectedExamslist.length; index++) {
            const  element =  this.selectedExamslist[index].examName + ' ( ' + this.datePipe.transform(this.selectedExamslist[index].examFromDate, this.dateFormate) + '-' +
            this.datePipe.transform(this.selectedExamslist[index].examToDate, this.dateFormate) + ' ) ' ; 
            if ( index > 0){
              this.tempV = this.tempV + ' && ' + element;
            }else{
              this.tempV = element;
            }
            
          }
        // tslint:disable-next-line:max-line-length
        this.crudService.listBySevenIds(this.finalInternalMarksUrl, this.examsMultiCtrl.value,this.internalMarksCalForm.value.collegeId, this.internalMarksCalForm.value.courseGroupId, this.internalMarksCalForm.value.courseYearId, '0', '0', this.examIntMarkTypeId,
        'in_exam_ids', 'in_college_id', 'in_course_group_id', 'in_course_year_id', 'in_subject_id', 'in_std_id', 'in_final_type' )
          .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200){
                if (result.success) {
                     this.finalInternalMarks = result.data.result[0];  

                     // tslint:disable-next-line: prefer-for-of
                     for (let i = 0; i < this.finalInternalMarks.length; i++){

                      if (this.finalInternalMarks[i].marks === null){
                        this.finalInternalMarks[i].marks = 0;
                      }

                      if (this.intExams.filter(x => (x.exam_name === this.finalInternalMarks[i].exam_name)).length === 0){
                           this.intExams.push({
                               exam_name : this.finalInternalMarks[i].exam_name
                           });
                      }
                      if (this.keys.filter(x => (x.subject_code === this.finalInternalMarks[i].subject_code)).length === 0){
                          
                          this.keys.push({
                              'subject_code': this.finalInternalMarks[i].subject_code,
                              'subject_name': this.finalInternalMarks[i].subject_name,
                              'exams': this.examNames,
                          });
                      }
                      
                  }

                  // if(this.keys && this.keys.length > 0){
                  //   const subjects = this.keys.map(({ fk_subject_id }) => fk_subject_id);
                  //   this.keys = this.keys.filter(({ fk_subject_id }, index) =>
                  //       !subjects.includes(fk_subject_id, index + 1));
                  // }

                     // tslint:disable-next-line: prefer-for-of
                     for (let i = 0; i < this.keys.length; i++){
                      // tslint:disable-next-line: prefer-for-of
                      for (let j = 0; j < this.examNames.length; j++){
                        if (this.stdSubjects.filter(x => (x.subject_code === this.keys[i].subject_code && x.exam_name === this.examNames[j])).length === 0){
                          this.stdSubjects.push({
                              'subject_code':this.keys[i].subject_code,
                              'subject_name': this.keys[i].subject_name, 
                              'exam_name': this.examNames[j], 
                              'marks': '0'
                          });
                        }
                      }
                  }

                     for (let i = 0; i < this.finalInternalMarks.length; i++){

                      if (this.midExamMarks.length > 0){

                          if (this.midExamMarks.filter(x => (x.rollNumber === this.finalInternalMarks[i].roll_number)).length > 0){                          
                              // tslint:disable-next-line:max-line-length
                              if (this.midExamMarks.filter(x => (x.rollNumber === this.finalInternalMarks[i].roll_number))[0].studentMarksCount.filter(y => (y.subject_code === this.finalInternalMarks[i].subject_code && y.exam_name === this.finalInternalMarks[i].exam_name)).length > 0){
                                  // tslint:disable-next-line:max-line-length
                                  this.midExamMarks.filter(x => (x.rollNumber === this.finalInternalMarks[i].roll_number))[0].studentMarksCount.filter(y => (y.subject_code === this.finalInternalMarks[i].subject_code && y.exam_name === this.finalInternalMarks[i].exam_name))[0].marks = this.finalInternalMarks[i].marks;
                                   // tslint:disable-next-line:max-line-length
                                  this.midExamMarks.filter(x => (x.rollNumber === this.finalInternalMarks[i].roll_number))[0].studentMarksCount.filter(y => (y.subject_code === this.finalInternalMarks[i].subject_code && y.exam_name === this.finalInternalMarks[i].exam_name))[0].pk_exam_final_int_mark_id = this.finalInternalMarks[i].pk_exam_final_int_mark_id;
                                   // tslint:disable-next-line:max-line-length
                                  this.midExamMarks.filter(x => (x.rollNumber === this.finalInternalMarks[i].roll_number))[0].studentMarksCount.filter(y => (y.subject_code === this.finalInternalMarks[i].subject_code && y.exam_name === this.finalInternalMarks[i].exam_name))[0].created_dt = this.finalInternalMarks[i].created_dt;
                                    // tslint:disable-next-line:max-line-length
                                  this.midExamMarks.filter(x => (x.rollNumber === this.finalInternalMarks[i].roll_number))[0].studentMarksCount.filter(y => (y.subject_code === this.finalInternalMarks[i].subject_code && y.exam_name === this.finalInternalMarks[i].exam_name))[0].fk_student_id = this.finalInternalMarks[i].fk_student_id;
                                   // tslint:disable-next-line:max-line-length
                                  this.midExamMarks.filter(x => (x.rollNumber === this.finalInternalMarks[i].roll_number))[0].studentMarksCount.filter(y => (y.subject_code === this.finalInternalMarks[i].subject_code && y.exam_name === this.finalInternalMarks[i].exam_name))[0].fk_subject_id = this.finalInternalMarks[i].fk_subject_id;
                                    // tslint:disable-next-line:max-line-length
                                  this.midExamMarks.filter(x => (x.rollNumber === this.finalInternalMarks[i].roll_number))[0].studentMarksCount.filter(y => (y.subject_code === this.finalInternalMarks[i].subject_code && y.exam_name === this.finalInternalMarks[i].exam_name))[0].fk_course_year_id = this.finalInternalMarks[i].fk_course_year_id;
                              }
                          }else{

                              this.midExamMarks.push({
                                  rollNumber: this.finalInternalMarks[i].roll_number,
                                  firstName: this.finalInternalMarks[i].first_name,
                                  studentMarksCount: []
                              });

                              // tslint:disable-next-line: prefer-for-of
                              for (let j = 0; j < this.stdSubjects.length; j++){
                                  this.stdSubjects[j].marks = 0;
                                  this.stdSubjects[j].pk_exam_final_int_mark_id = null;
                                  this.stdSubjects[j].created_dt = null;
                                  this.stdSubjects[j].fk_student_id = null;
                                  this.stdSubjects[j].fk_subject_id = null;
                                  this.stdSubjects[j].fk_course_year_id = null;
                                  // tslint:disable-next-line:max-line-length
                                  if (this.stdSubjects[j].subject_code === this.finalInternalMarks[i].subject_code && this.stdSubjects[j].exam_name === this.finalInternalMarks[i].exam_name){
                                      this.stdSubjects[j].marks = this.finalInternalMarks[i].marks;
                                      this.stdSubjects[j].pk_exam_final_int_mark_id = this.finalInternalMarks[i].pk_exam_final_int_mark_id;
                                      this.stdSubjects[j].created_dt = this.finalInternalMarks[i].created_dt;
                                      this.stdSubjects[j].fk_student_id = this.finalInternalMarks[i].fk_student_id;
                                      this.stdSubjects[j].fk_subject_id = this.finalInternalMarks[i].fk_subject_id;
                                      this.stdSubjects[j].fk_course_year_id = this.finalInternalMarks[i].fk_course_year_id;
                                  }

                                  if (this.midExamMarks.filter(x => (x.rollNumber === this.finalInternalMarks[i].roll_number)).length > 0){                                 
                                      this.midExamMarks.filter(x => (x.rollNumber === this.finalInternalMarks[i].roll_number))[0].studentMarksCount.push({
                                          subject_code:this.stdSubjects[j].subject_code,
                                          subject_name: this.stdSubjects[j].subject_name,
                                          exam_name: this.stdSubjects[j].exam_name,
                                          marks: this.stdSubjects[j].marks,
                                          pk_exam_final_int_mark_id: this.stdSubjects[j].pk_exam_final_int_mark_id,
                                          created_dt: this.stdSubjects[j].created_dt,
                                          fk_student_id: this.stdSubjects[j].fk_student_id,
                                          fk_subject_id: this.stdSubjects[j].fk_subject_id,
                                          fk_course_year_id: this.stdSubjects[j].fk_course_year_id,
                                      });
                                  }
                              }
                          }

                      }else{

                          this.midExamMarks.push({
                              rollNumber: this.finalInternalMarks[i].roll_number,
                              firstName: this.finalInternalMarks[i].first_name,
                              studentMarksCount: []
                          });

                          // tslint:disable-next-line: prefer-for-of
                          for (let j = 0; j < this.stdSubjects.length; j++){
                              this.stdSubjects[j].marks = 0;
                              this.stdSubjects[j].pk_exam_final_int_mark_id = null;
                              this.stdSubjects[j].created_dt = null;
                              this.stdSubjects[j].fk_student_id = null;
                              this.stdSubjects[j].fk_subject_id = null;
                              this.stdSubjects[j].fk_course_year_id = null;
                              // tslint:disable-next-line:max-line-length
                              if (this.stdSubjects[j].subject_code === this.finalInternalMarks[i].subject_code && this.stdSubjects[j].exam_name === this.finalInternalMarks[i].exam_name){
                                  this.stdSubjects[j].marks = this.finalInternalMarks[i].marks;
                                  this.stdSubjects[j].pk_exam_final_int_mark_id = this.finalInternalMarks[i].pk_exam_final_int_mark_id;
                                  this.stdSubjects[j].created_dt = this.finalInternalMarks[i].created_dt;
                                  this.stdSubjects[j].fk_student_id = this.finalInternalMarks[i].fk_student_id;
                                  this.stdSubjects[j].fk_subject_id = this.finalInternalMarks[i].fk_subject_id;
                                  this.stdSubjects[j].fk_course_year_id = this.finalInternalMarks[i].fk_course_year_id;
                              }

                              if (this.midExamMarks.filter(x => (x.rollNumber === this.finalInternalMarks[i].roll_number)).length > 0){                                 
                                  this.midExamMarks.filter(x => (x.rollNumber === this.finalInternalMarks[i].roll_number))[0].studentMarksCount.push({
                                      subject_code: this.stdSubjects[j].subject_code,
                                      subject_name: this.stdSubjects[j].subject_name,
                                      exam_name: this.stdSubjects[j].exam_name,
                                      marks: this.stdSubjects[j].marks,
                                      pk_exam_final_int_mark_id: this.stdSubjects[i].pk_exam_final_int_mark_id,
                                      created_dt: this.stdSubjects[i].created_dt,
                                      fk_student_id: this.stdSubjects[i].fk_student_id,
                                      fk_subject_id: this.stdSubjects[i].fk_subject_id,
                                      fk_course_year_id: this.stdSubjects[i].fk_course_year_id,
                                  });
                              }
                          }
                      }
                  }
                }else {
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

  addInternalAvgMarks(): void{
     if (this.midExamMarks.length > 0){
         this.examIntMarks = [];
         this.spinner.show();
         let examIds = '';
         for (let i = 0; i < this.examsMultiCtrl.value.length; i++){
             if (i === 0){
              examIds = this.examsMultiCtrl.value[i];
             }else{
              examIds = examIds + ',' + this.examsMultiCtrl.value[i];
             }
         }
          // tslint:disable-next-line: prefer-for-of
         this.finalMidExamMarks=this.finalInternalMarks;
         for (let i = 0; i < this.finalMidExamMarks.length; i++){
            if (this.finalMidExamMarks[i].exam_name === 'Final'){
               this.examIntMarks.push({
                 examFinalIntMarkId: this.finalMidExamMarks[i].pk_exam_final_int_mark_id,
                 createdDt: this.finalMidExamMarks[i].created_dt,
                 finalMarks: this.finalMidExamMarks[i].marks,
                 examIds: examIds,
                 internalMarks: this.finalMidExamMarks[i].marks,
                 isActive: true,
                 isPublished: true,
                 publishedOn: this.genericFunctions.moment(),
                 collegeId: this.internalMarksCalForm.value.collegeId,
                 studentId: this.finalMidExamMarks[i].fk_student_id,
                 courseYearId: this.finalMidExamMarks[i].fk_course_year_id,
                 subjectId: this.finalMidExamMarks[i].fk_subject_id,
               });
            }
      }

         // tslint:disable-next-line: prefer-for-of
        //  for (let i = 0; i < this.midExamMarks.length; i++){
        //      for (let j = 0; j < this.midExamMarks[i].studentMarksCount.length; j++){
        //        if (this.midExamMarks[i].studentMarksCount[j].exam_name === 'Final' && this.midExamMarks[i].studentMarksCount[j].fk_student_id!=null){
        //           this.examIntMarks.push({
        //             examFinalIntMarkId: this.midExamMarks[i].studentMarksCount[j].pk_exam_final_int_mark_id,
        //             createdDt: this.midExamMarks[i].studentMarksCount[j].created_dt,
        //             finalMarks: this.midExamMarks[i].studentMarksCount[j].marks,
        //             examIds: examIds,
        //             internalMarks: this.midExamMarks[i].studentMarksCount[j].marks,
        //             isActive: true,
        //             isPublished: true,
        //             publishedOn: this.genericFunctions.moment(),
        //             collegeId: this.internalMarksCalForm.value.collegeId,
        //             studentId: this.midExamMarks[i].studentMarksCount[j].fk_student_id,
        //             courseYearId: this.midExamMarks[i].studentMarksCount[j].fk_course_year_id,
        //             subjectId: this.midExamMarks[i].studentMarksCount[j].fk_subject_id,
        //           });
        //        }
        //      }
        //  }
         this.crudService.add(this.finalInternalMarksListUrl, this.examIntMarks)
              .subscribe(result => {
                  this.spinner.hide();
                  if (result.success){
                        this.snotifyService.success(result.message, 'Success!');
                        this.getList();
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
