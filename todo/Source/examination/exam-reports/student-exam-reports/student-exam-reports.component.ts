import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CONSTANTS } from 'app/main/common/constants';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { AcademicYear } from 'app/main/models/academicYear';
import { CourseYear } from 'app/main/models/courseYearRegulation';
import { Subject, ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-student-exam-reports',
  templateUrl: './student-exam-reports.component.html',
  styleUrls: ['./student-exam-reports.component.scss']
})

export class StudentExamReportsComponent implements OnInit {

  feeFormGroup: FormGroup;
  displayedValues: string[] = [];
  displayedColumns: string[] = ['id', 'Subject_Name', 'Course_Year', 'Exam_Name', 'Marks', 'Total_Marks', 'Percentage'];
  columns = [];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private examStudentReportUrl = CONSTANTS.examStudentReportUrl;
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private isActive = CONSTANTS.isActive;
  private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
  private examDetailsByStudentCourseYearUrl = CONSTANTS.examDetailsByStudentCourseYearUrl;
  private studentSearchUrl = CONSTANTS.studentSearchUrl;
  private sortOrder = CONSTANTS.sortOrder;

  panelOpenState = true;
  keys: any[] = [];
  studentExamMarksList: any[] = [];
  colleges: College[] = [];
  courses: Course[] = [];
  courseGroups: CourseGroup[] = [];
  academicYears: AcademicYear[] = [];
  courseYears: CourseYear[] = [];
  defaultAcademicYearId;
  step = 0;
  exams: any[] = [];
  searchStudents = [];

  public studentFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredStudents: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  constructor(private router: Router, private formBuilder: FormBuilder, private dialog: MatDialog, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions) {
   /*..............  DEFAULT ACADEMIC YEAR......... */
   this.defaultAcademicYearId = localStorage.getItem('academicYearId');
   this.getData();
  }

  // tslint:disable-next-line: typedef
  ngOnInit() {

    this.feeFormGroup = this.formBuilder.group({
      collegeId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      courseId: ['', Validators.required],
      courseGroupId: [ '', Validators.required],
      courseYearId: ['', Validators.required],
      examId: ['', Validators.required],
      studentId: ['', Validators.required],
    }); 

    this.dataSource = new MatTableDataSource<any>(this.studentExamMarksList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.studentFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterStd();
      });

    this.searchStudents.push({firstName: 'Search by student name or rollno.'});
    this.filteredStudents.next(this.searchStudents.slice());  
 
  }

  filterStd(): void {
    if (!this.searchStudents) {
      return;
    }
    // get the search keyword
    let search = this.studentFilterCtrl.value;
    if (!search) {
      this.filteredStudents.next(this.searchStudents.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the banks
    this.filteredStudents.next(
      this.searchStudents.filter(x => x.firstName.toLowerCase().indexOf(search) > -1)
    );
  }

  enteredStudent(event): void{
    if (event.target.value.length > 4){
        /*----------- STUDENTS -----------*/
        this.crudService.listByTwoIds(this.studentSearchUrl, this.feeFormGroup.value.collegeId, event.target.value,
            'collegeId', 'q')
            .subscribe(result => {
                if (result.statusCode === 200){
                        if (result.data && result.data !== '') {  
                            this.searchStudents = result.data;
                            this.filteredStudents.next(this.searchStudents.slice());                
                        }
                    }else{
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

  getData(): void{

    /*----------- COLLEGES -----------*/
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
         .subscribe(result => {
             if (result.statusCode === 200){
                     if (result.data.resultList && result.data.resultList !== '') {
                         this.colleges = result.data.resultList;   
                         if ( this.colleges.length > 0){
                          this.feeFormGroup.get('collegeId').setValue(this.colleges[0].collegeId);
                          this.selectedCollege(this.feeFormGroup.value.collegeId);
                         }
                        
                                 
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
    this.feeFormGroup.get('academicYearId').setValue('');
    this.feeFormGroup.get('courseId').setValue('');
    this.feeFormGroup.get('courseGroupId').setValue('');
    this.feeFormGroup.get('courseYearId').setValue('');
    
    this.studentExamMarksList = [];
    this.academicYears = [];
    this.courses = [];
    this.courseGroups = [];
    this.courseYears = [];
    
    // this.dataSource = new MatTableDataSource<any>(this.studentExamMarksList);
    /*----------- ACADEMIC YEARS -----------*/
    this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
    .subscribe(result => {
        if (result.statusCode === 200) {
            if (result.data.resultList && result.data.resultList !== '') {
                this.academicYears = result.data.resultList;

                if (this.academicYears.length > 0 ){
                  if (this.academicYears.filter(x => (x.academicYearId === +this.defaultAcademicYearId)).length > 0){
                    this.feeFormGroup.get('academicYearId').setValue(+this.defaultAcademicYearId);
                    this.selectedAcademicYear(this.feeFormGroup.value.academicYearId); 
                  } 
              }            
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

    // tslint:disable-next-line:typedef
    selectedAcademicYear(academicYearId){

      this.feeFormGroup.get('courseId').setValue('');
      this.feeFormGroup.get('courseGroupId').setValue('');
      this.feeFormGroup.get('courseYearId').setValue('');
      
      this.studentExamMarksList = [];
      this.courses = [];
      this.courseGroups = [];
      this.courseYears = [];
      

      // this.dataSource = new MatTableDataSource<any>(this.studentExamMarksList);
      if (academicYearId !== null && academicYearId !== ''){
    /*----------- COURSES -----------*/
    this.crudService.listDetailsByTwoIds(this.courseCrudUrl, this.feeFormGroup.value.collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                if (result.data.resultList && result.data.resultList !== '') {
                    this.courses = result.data.resultList; 
                    if (this.courses.length > 0){
                      this.feeFormGroup.get('courseId').setValue(this.courses[0].courseId);
                      this.selectedCourse(this.feeFormGroup.value.courseId); 
                   }                    
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
      this.courseGroups = [];
      this.courseYears = [];
      
      this.feeFormGroup.get('courseGroupId').setValue('');
      this.feeFormGroup.get('courseYearId').setValue('');
      
      this.studentExamMarksList = [];
      // this.dataSource = new MatTableDataSource<any>(this.studentExamMarksList);
    /*----------- COURSES GROUPS -----------*/      
      this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200) {
            if (result.data.resultList && result.data.resultList !== '') {
                this.courseGroups = result.data.resultList;
                if (this.courseGroups.length > 0){
                  this.feeFormGroup.get('courseGroupId').setValue(this.courseGroups[0].courseGroupId);
                  this.selectedGroup(this.feeFormGroup.value.courseGroupId); 
               }
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

  selectedGroup(courseGroupId): void{
      this.courseYears = [];
      
      this.feeFormGroup.get('courseYearId').setValue('');
      this.feeFormGroup.get('studentId').setValue('');
      this.feeFormGroup.get('examId').setValue('');
      this.studentExamMarksList = [];
      // this.dataSource = new MatTableDataSource<any>(this.studentExamMarksList);
      if (this.feeFormGroup.value.collegeId != null && courseGroupId != null){

      /*----------- COURSES Years -----------*/      
      
      this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, this.feeFormGroup.value.courseId, 'true', 'ASC',
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

  selectedYear(): void{
    this.feeFormGroup.get('studentId').setValue('');
  }

  selectedStudent(studentId): void{
    if (studentId != null){
      this.feeFormGroup.get('examId').setValue('');
     /*----------- EXAMS -----------*/      
      this.crudService.listByTwoIds(this.examDetailsByStudentCourseYearUrl, studentId, this.feeFormGroup.value.courseYearId, 'studentId', 'courseYearId')
     .subscribe(result => {
         this.spinner.hide();
         if (result.statusCode === 200) {
             if (result.data && result.data !== '') {
                 this.exams = result.data;
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

 getExamMarks(): void{
   this.studentExamMarksList = [];
   this.dataSource = new MatTableDataSource<any>(this.studentExamMarksList);
   this.dataSource.paginator = this.paginator;
   this.dataSource.sort = this.sort;
   if (this.feeFormGroup.valid){
     this.spinner.show();
     /*----------- STUDENTS -----------*/
     this.crudService.listByFiveIds(this.examStudentReportUrl,
          0, 0, this.feeFormGroup.value.studentId, 0, this.feeFormGroup.value.courseYearId,
         'in_exam_std_id', 'in_exam_id', 'in_student_id', 'in_college_id', 'in_courseyear_id')
          .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
                if (result.success) {
                    this.studentExamMarksList = result.data.result[0];
  
                    this.dataSource = new MatTableDataSource<any>(this.studentExamMarksList);
                    this.dataSource.paginator = this.paginator;
                    this.dataSource.sort = this.sort;
    
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

}
