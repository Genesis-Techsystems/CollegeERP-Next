import { Component, OnInit, ViewChild } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseYear } from 'app/main/models/courseYearRegulation';
import { ActivatedRoute, Router } from '@angular/router';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { ReplaySubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-exam-evaluation',
  templateUrl: './exam-evaluation.component.html',
  styleUrls: ['./exam-evaluation.component.scss']
})

export class ExamEvaluationComponent implements OnInit {

  displayedColumns: string[] = ['id', 'stdName', 'subjectName', 'examRevisionTypeCatCode', 'previousMarks', 'marks'];
  dataSource: MatTableDataSource<any>;
 
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  panelOpenState = true;
  isHOD;

  public searchText: string;

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
  private isActive = CONSTANTS.isActive;
  private examMasterUrl = CONSTANTS.examMasterUrl;
  private examRevisionSubjectCrudUrl = CONSTANTS.examRevisionSubjectCrudUrl;
  private examRevisionSubjectUrl = CONSTANTS.examRevisionSubjectUrl;
  private sortOrder = CONSTANTS.sortOrder;

  staffForm: FormGroup;
  colleges: College[] = [];
  courses: Course[] = [];
  courseYears: CourseYear[] = [];
  step = 0;  
  dashboard;
  revisedSubjects: any[] = [];
  examsList = [];
  searchExams = [];

  public examFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredExams: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  
  constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions) {
      this.isHOD = false;
      this.getData();
      this.dashboard = CONSTANTS.dashboard;
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {

    this.staffForm = this.formBuilder.group({
        collegeId: ['', Validators.required],
        courseId: ['', Validators.required],
        courseYearId: ['', Validators.required],
        examId: ['', Validators.required],
      });  
    this.dataSource = new MatTableDataSource<any>(this.revisedSubjects);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.examFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterExam();
      });

    this.searchExams.push({examName: 'Search by Exam name.'});
    this.filteredExams.next(this.searchExams.slice());
  }

  filterExam(): void {
    if (!this.searchExams) {
      return;
    }
    // get the search keyword
    let search = this.examFilterCtrl.value;
    if (!search) {
      this.filteredExams.next(this.searchExams.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the banks
    this.filteredExams.next(
      this.searchExams.filter(x => x.examName.toLowerCase().indexOf(search) > -1)
    );
  }

   // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  getData(): void{
    /*----------- COLLEGES -----------*/
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
         .subscribe(result => {
             if (result.statusCode === 200){
                     if (result.data.resultList && result.data.resultList !== '') {
                         this.colleges = result.data.resultList;                 
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
    this.staffForm.get('courseId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.courses = [];
    this.courseYears = [];
    this.revisedSubjects = [];
    this.dataSource = new MatTableDataSource<any>(this.revisedSubjects);
    this.searchExams = [];
    this.searchExams.push({examName: 'Search by Exam name.'});
    this.filteredExams.next(this.searchExams.slice());
    // this.dataSource = new MatTableDataSource<any>(this.subjectCourseYears);
    if (collegeId !== null && collegeId !== ''){
      /*----------- COURSES -----------*/
      this.crudService.listDetailsByTwoIds(this.courseCrudUrl, this.staffForm.value.collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
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
      this.courseYears = [];
      this.staffForm.get('courseYearId').setValue('');
      this.revisedSubjects = [];
      this.searchExams = [];
      this.searchExams.push({examName: 'Search by Exam name.'});
      this.filteredExams.next(this.searchExams.slice());
      this.dataSource = new MatTableDataSource<any>(this.revisedSubjects);
      if (this.staffForm.value.collegeId != null && courseId != null){

      /*----------- COURSES Years -----------*/      
      
      this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, courseId, 'true', 'ASC',
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
    this.searchExams = [];
    this.searchExams.push({examName: 'Search by Exam name.'});
    this.filteredExams.next(this.searchExams.slice());
    this.revisedSubjects = [];
    this.dataSource = new MatTableDataSource<any>(this.revisedSubjects);
    if (courseYearId != null){
          /*----------- Exams List -----------*/      
          this.crudService.listDetailsByThreeIdsWithSort(this.examMasterUrl, this.staffForm.value.collegeId, this.staffForm.value.courseId, 'true', 'DESC',
          this.getDetailsByCollegeIdUrl , this.getDetailsByCourseIdUrl, this.isActive, 'createdDt')
        .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
              if (result.success) {
                  this.examsList = [];
                  // tslint:disable-next-line: prefer-for-of
                  for (let i = 0; i < result.data.resultList.length; i++){
                    if (!result.data.resultList[i].isInternalExam){
                        this.examsList.push(result.data.resultList[i]);
                    }
                  }
                  this.searchExams = this.examsList;
                  this.filteredExams.next(this.searchExams.slice());    
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

  selectedExternalExam(examId): void{
      if (this.staffForm.valid){
        this.spinner.show();
        this.crudService.listDetailsByThreeIds(this.examRevisionSubjectCrudUrl, 'true', examId, this.staffForm.value.courseYearId, 
          'isActive', 'examMaster.examId', 'courseYear.courseYearId')
              .subscribe(result => {
                  this.spinner.hide();
                  if (result.statusCode === 200) {
                      if (result.data.resultList && result.data.resultList !== '') {
                          this.revisedSubjects = result.data.resultList;
                          // tslint:disable-next-line: prefer-for-of
                          for (let i = 0; i < this.revisedSubjects.length; i++){
                            // if (this.revisedSubjects[i].revisedMarks != null){
                            //     this.revisedSubjects[i].marks = this.revisedSubjects[i].revisedMarks;
                            // }else{
                            //     this.revisedSubjects[i].marks = this.revisedSubjects[i].reevaluationMarks;
                            // }
                            if (this.revisedSubjects[i].examRevisionTypeCatCode === 'REEVALUATION'){
                               if (this.revisedSubjects[i].revisedMarks === null){
                                  this.revisedSubjects[i].marks = this.revisedSubjects[i].previousMarks;
                               }else{
                                  this.revisedSubjects[i].marks = this.revisedSubjects[i].revisedMarks;
                               }
                            }else if (this.revisedSubjects[i].examRevisionTypeCatCode === 'RECALCULATION'){
                              if (this.revisedSubjects[i].revisedMarks === null){
                                this.revisedSubjects[i].marks = this.revisedSubjects[i].previousMarks;
                             }else{
                                this.revisedSubjects[i].marks = this.revisedSubjects[i].revisedMarks;
                             }
                            }
                          }
                          this.dataSource = new MatTableDataSource<any>(this.revisedSubjects);
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

  publish(): void{
    if (this.revisedSubjects.length > 0){
      
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < this.revisedSubjects.length; i++){
          if (this.revisedSubjects[i].examRevisionTypeCatCode === 'REEVALUATION'){
            this.revisedSubjects[i].revisedMarks = this.revisedSubjects[i].marks;
            this.revisedSubjects[i].isReevaluationMarksPublished = true;
            this.revisedSubjects[i].reevaluationEnteredEmpId = +localStorage.getItem('employeeId');
          }else{
            this.revisedSubjects[i].revisedMarks = this.revisedSubjects[i].marks;
            this.revisedSubjects[i].revisedByEmpId = +localStorage.getItem('employeeId');
            this.revisedSubjects[i].isPublished = true;
            this.revisedSubjects[i].revisedDate = this.genericFunctions.moment();
          }
        }   
        this.spinner.show();
               /*---------- EXAM FEE PAY ----------*/
        this.crudService.add(this.examRevisionSubjectUrl, this.revisedSubjects)
               .subscribe(result => {
                   this.spinner.hide();
                   if (result.success){
                          this.snotifyService.success(result.message, 'Success!');
                          this.selectedExternalExam(this.staffForm.value.examId);
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

  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
      this.dataSource.filter = filterValue.trim().toLowerCase();
      if (this.dataSource.paginator) {
          this.dataSource.paginator.firstPage();
      }
  }

}
