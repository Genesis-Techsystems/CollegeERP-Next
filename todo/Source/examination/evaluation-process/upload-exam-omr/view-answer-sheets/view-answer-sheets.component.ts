import { Component, Inject, ElementRef, OnInit, ViewChild } from '@angular/core';
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
import { ReplaySubject, Subject, of } from 'rxjs';
import * as _ from 'lodash';
import { distinct, takeUntil } from 'rxjs/operators';
import { ViewModalComponent } from '../view-modal/view-modal.component';

@Component({
  selector: 'app-view-answer-sheets',
  templateUrl: './view-answer-sheets.component.html',
  styleUrls: ['./view-answer-sheets.component.scss']
})
export class ViewAnswerSheetsComponent implements OnInit {

  displayedColumns: string[] = ['id','omrSerialNo', 'studentAnswerPath'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  @ViewChild('uploadXl') uploadXl: ElementRef;
  examTimetableList: any[] = []
  miniopath = CONSTANTS.MINIO
  private ExamEvaluationUrl=CONSTANTS.ExamEvaluatorUrl;
  private ExamEvaluatorProfilesUrl=CONSTANTS.ExamEvaluatorProfilesUrl
  private ExamStudentAnswerPaperUrl=CONSTANTS.ExamStudentAnswerPaperUrl;
  private examtTimetableDetailsUrl = CONSTANTS.examtTimetableDetailsUrl;
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
  private isActive = CONSTANTS.isActive;
//   examEvaluationList=[]
  examEvaluationList1=[]

  private sortOrder = CONSTANTS.sortOrder;
  public formData;
  datevis=false;

  evaluatorForm: FormGroup;
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
  
  examDate = this.genericFunctions.momentWithDateFormatYMD(this.genericFunctions.moment()) ;

  public employeeFilterCtrl: FormControl = new FormControl();
  public examFilterCtrl: FormControl = new FormControl();
  public subjectFilterCtrl: FormControl = new FormControl();

  public filteredExam: ReplaySubject<any[]> = new ReplaySubject<any[]>(1); 
  public filteredEmployees: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  private _onDestroy = new Subject<void>();
  searchExams=[];
examEvaluationList: any[];
  
  Barcode: any;
  data: any;
  courseCode: string;
  duplicateCourseGroups: any=[];
  examDetails: ExamMaster;
  examAnswerPapaerList: any=[];
  PaperCount: any;
  check = false;
    examEvaluationProfileList: any;
    filtered: { examEvaluatorProfileId: number; evaluatorName: string; email: string; examEvaluatorsId: string; NumberOfAssignEvaluators: string; NumberOfDueEvaluators: string; checked: boolean; }[];
  selectedSubjects: any[];
  CoureGroups=[];
  SubjectsList=[];
  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,) {        
      this.getData();
  }

        ngOnInit(): void {
    this.evaluatorForm = this.formBuilder.group({
      courseId: ['', Validators.required],  
      collegeId: ['', Validators.required],  
      academicYearId: ['', Validators.required],  
      courseGroupId: ['', ],  
      examId: ['', Validators.required],
      examTimetableDetId: ['',Validators.required],
      examDate: [this.genericFunctions.moment()],
      courseYearId: ['', Validators.required],
      groupSectionId: [],
      subjectTypeId: ['', ],
      subjectId: [],
      employeeId: [],
      regulationId: [],
      fDate: [this.genericFunctions.moment()],
  });

  this.examFilterCtrl.valueChanges
  .pipe(takeUntil(this._onDestroy))
  .subscribe(() => {
    this.filterExam();
  });
  this.searchExams.push({firstName: 'Search by Exam.'});  
  this.filteredExam.next(this.searchExams.slice()); 
  
  this.dataSource = new MatTableDataSource<any>(this.examEvaluationList);
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
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
selectedSubject(){
  this.flag=false
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
    this.collegeCode = this.colleges.filter(x => (x.collegeId === collegeId))[0].collegeCode;
    
    this.evaluatorForm.get('courseId').setValue('');
    this.courses = [];
    if (collegeId !== null && collegeId !== ''){
        //----------- COURSES -----------//
        this.crudService.listDetailsByTwoIds(this.courseCrudUrl, collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
        .subscribe(result => {
            if (result.statusCode === 200){
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.courses = result.data.resultList;
                       
                            this.evaluatorForm.get('courseId').setValue(+localStorage.getItem('courseId'));
                            this.data =  this.data + ' / ' + this.courses.filter(x => (x.courseId === this.evaluatorForm.value.courseId))[0].courseCode;
                             this.selectedCourse(this.evaluatorForm.value.courseId); 
                         
                               
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
    
        this.evaluatorForm.get('courseYearId').setValue('');
        this.courseYears = [];

             //----------- ACADEMIC YEARS -----------//
        this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl,  this.evaluatorForm.value.collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
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
              //----------- COURSE GROUPS -----------//
        this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
                .subscribe(result => {
                    if (result.statusCode === 200) {
                        if (result.data.resultList && result.data.resultList !== '') {
                            this.courseGroups = result.data.resultList;
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

               //----------- COURSE YEARS -----------//
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
  this.academicYear =  this.academicYears.filter(x => (x.academicYearId === this.evaluatorForm.value.academicYearId))[0].academicYear;
  this.examsList = [];
  this.evaluatorForm.get('examId').setValue('');
  this.evaluatorForm.get('courseYearId').setValue('');
  this.evaluatorForm.get('courseYearId').setValue('');
  this.evaluatorForm.get('courseGroupId').setValue('');
  this.evaluatorForm.get('examTimetableDetId').setValue('');
  if (academicYearId){
          this.crudService.listDetailsByFourIdsWithSortOrder(this.examMasterUrl, this.evaluatorForm.value.collegeId, this.evaluatorForm.value.courseId, academicYearId, 'true', 
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
  this.examDetails =  this.examsList.filter(x => (x.examId === this.evaluatorForm.value.examId))[0];
  this.evaluatorForm.get('courseYearId').setValue('');
  this.evaluatorForm.get('courseGroupId').setValue('');
  this.evaluatorForm.get('examTimetableDetId').setValue('');
  this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, this.evaluatorForm.value.courseId, 'true', 'ASC',
  this.getDetailsByCourseIdUrl, this.isActive, this.sortOrder)
 .subscribe(result => {
     if (result.statusCode === 200){
             if (result.data.resultList && result.data.resultList !== '') {
                 this.courseYears = result.data.resultList;
                //  this.selectedCourseYear(this.evaluatorForm.value.courseYearId);
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
  this.evaluatorForm.get('courseGroupId').setValue('');
  this.evaluatorForm.get('examTimetableDetId').setValue('');

  this.CoureGroups=[]
  this.examTimetableList = [];  
  this.examDetails =  this.examsList.filter(x => (x.examId === this.evaluatorForm.value.examId))[0];
  this.courseGroups = [];
  this.courseGroups = this.duplicateCourseGroups;
  if ( courseYearId != null ){
      this.spinner.show();
      //----------- EXAM FEE STRUCTURES -----------/
      this.crudService.listByThreeIds(this.examtTimetableDetailsUrl, this.evaluatorForm.value.courseYearId, 
       this.evaluatorForm.value.courseId, this.evaluatorForm.value.examId, 'courseYearId', 'courseId', 'examId')
      .subscribe(result => {
          this.examTimetableList = [];  
          this.selectedSubjects=[];
          this.spinner.hide();
          if (result.statusCode === 200){
                  if (result.success) {
                      this.CoureGroups=result.data.filter(x=>x.courseYearId==this.evaluatorForm.value.courseYearId)
                      this.examTimetableList = result.data;  
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

searchdata(value) { 
  this.selectedSubjects=[]
 this.search(value);
  }
search(value: string) { 
  let filter = value.toLowerCase();
  for ( let i = 0 ; i < this.SubjectsList.length; i++ ) {
      let option = this.SubjectsList[i];
      if (option.subjectName.toLowerCase().indexOf(filter) >= 0) {
          this.selectedSubjects.push(option);
      }
      else if (option.subjectCode.toLowerCase().indexOf(filter) >= 0) {
        this.selectedSubjects.push(option);
    }
     
  }
}
selectedcourseGroupId(CoureGroupId){
  this.evaluatorForm.get('examTimetableDetId').setValue('');
  this.SubjectsList=[]
  this.selectedSubjects=[]
  this.SubjectsList=this.examTimetableList.filter(x=>x.courseGroupId==this.evaluatorForm.value.courseGroupId)
  this.selectedSubjects = this.SubjectsList;
}

applyFilter(filterValue){
  this.dataSource.filter = filterValue.trim().toLowerCase();

  if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
  }
}


getAnswerPaperList(){
  this.flag = false;
  if(this.evaluatorForm.valid){
  this.flag = true;
    this.crudService.listDetailsByTwoIds(this.ExamStudentAnswerPaperUrl,this.evaluatorForm.value.examTimetableDetId,this.evaluatorForm.value.collegeId,'examTimetableDetail.examTimetableDetId','college.collegeId')
    .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
            if (result.data && result.data !== '') {
                this.snotifyService.success(result.message, 'Success!');
                this.examAnswerPapaerList = result.data.resultList;
                this.dataSource = new MatTableDataSource(this.examAnswerPapaerList);
                this.dataSource.paginator = this.paginator;
                this.dataSource.sort = this.sort;
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
  else{
    this.snotifyService.error("Please Select Filters", 'Error!');

  }
 
  }
  View(row){
  const dialogRef = this.dialog.open(ViewModalComponent, {
    width: '700px',
    data: row
});
  }
  openFile(path): void{
    window.open(this.miniopath+path,'_blank','width=700,height=600');
  }
}
             
          


