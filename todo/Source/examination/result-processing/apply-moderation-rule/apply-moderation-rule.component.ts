import { Component, OnInit, ViewChild } from '@angular/core';
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
import { CourseYear } from 'app/main/models/courseYearRegulation';
import { ExamMaster } from 'app/main/models/examMaster';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import {Location} from '@angular/common';

@Component({
  selector: 'app-apply-moderation-rule',
  templateUrl: './apply-moderation-rule.component.html',
  styleUrls: ['./apply-moderation-rule.component.scss']
})
export class ApplyModerationRuleComponent implements OnInit {

    
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  panelOpenState = true;
  
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private sortOrder = CONSTANTS.sortOrder;
  private examMasterUrl = CONSTANTS.examMasterUrl;
  private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
  private isActive = CONSTANTS.isActive;
  private examCourseYearSubjectUrl = CONSTANTS.examCourseYearSubjectUrl;
  private getDetailsByAcademicYearIdUrl = CONSTANTS.getDetailsByAcademicYearIdUrl;
  private subjectWiseModerationUrl = CONSTANTS.subjectWiseModerationUrl;

  examFeeCollectionForm: FormGroup;
  colleges: College[] = [];
  academicYears: AcademicYear[] = [];
  courses: Course[] = [];
  examsList: ExamMaster[] = [];
  courseGroups: CourseGroup[] = [];
  courseYears: CourseYear[] = [];
  courseYearSubjects: any[] = [];
  courseYearSubjectsByType: any[] = [];
  students: any[] = [];
  allStudentSubects: any[] = [];
  selectedStudents: any[] = [];
  examType: any[] = [];
  checksubject = true;
  public searchText: string;
  public searchText1: string;
  public searchText2: string;
  registeredStudents: any[] = [];
  subjectModerationStudents: any[] = [];
  selectedData: any;
  moderationRuleInfo:any[]=[];
  examData = [];
  subjectsData = [];
  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
              private dialog: MatDialog, private genericFunctions: GenericFunctions,  private _location: Location, private route: ActivatedRoute) {
      this.getData();

      this.dataSource = new MatTableDataSource<any>(this.students);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
  }

  ngOnInit(): void {
      this.examFeeCollectionForm = this.formBuilder.group({
          collegeId: ['', Validators.required],
          academicYearId: ['', Validators.required],
          courseId: ['', Validators.required],
          courseGroupId: ['', Validators.required],
          courseYearId: ['', Validators.required],
          examId: ['', Validators.required],
          studentId: [''],
          subjectId: ['', Validators.required],
      });
  }


  getData(): void {
      /*----------- COLLEGES -----------*/
      this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
          .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200) {
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.colleges = result.data.resultList;
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

  selectedCollege(collegeId): void {
      this.examFeeCollectionForm.get('academicYearId').setValue('');
      this.examFeeCollectionForm.get('courseId').setValue('');
      this.examFeeCollectionForm.get('examId').setValue('');
      this.examFeeCollectionForm.get('courseGroupId').setValue('');
      this.examFeeCollectionForm.get('courseYearId').setValue('');
      this.examFeeCollectionForm.get('subjectId').setValue('');
      this.courseYearSubjects = [];
      this.courses = [];
      this.examsList = [];
      this.courseYears = [];
      this.courseGroups = [];
      this.academicYears = [];
      this.students = [];
      this.selectedStudents = [];
      this.registeredStudents = [];
      this.searchText = '';
      this.searchText1 = '';
      this.searchText2 = '';
      /*----------- ACADEMIC YEARS -----------*/
      if (collegeId != null && collegeId !== undefined) {
        //  this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
        this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
            .subscribe(result => {
                  if (result.statusCode === 200) {
                      if (result.data.resultList && result.data.resultList !== '') {
                          this.academicYears = result.data.resultList;

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
  }

  // tslint:disable-next-line:typedef
  selectedAcademicYear(academicYearId) {
      this.examFeeCollectionForm.get('courseId').setValue('');
      this.examFeeCollectionForm.get('examId').setValue('');
      this.examFeeCollectionForm.get('courseGroupId').setValue('');
      this.examFeeCollectionForm.get('courseYearId').setValue('');
      this.examFeeCollectionForm.get('subjectId').setValue('');
      this.courseYearSubjects = [];
      this.courses = [];
      this.examsList = [];
      this.courseGroups = [];
      this.courseYears = [];
      this.students = [];
      this.selectedStudents = [];
      this.registeredStudents = [];
      this.searchText = '';
      this.searchText1 = '';
      this.searchText2 = '';
      /*----------- COURSES -----------*/
      if (academicYearId != null && academicYearId !== undefined) {
          this.crudService.listDetailsByTwoIds(this.courseCrudUrl, this.examFeeCollectionForm.value.collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
              .subscribe(result => {
                  if (result.statusCode === 200) {
                      if (result.data.resultList && result.data.resultList !== '') {
                          this.courses = result.data.resultList;

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
  }

  selectedCourse(courseId): void {
      this.examFeeCollectionForm.get('courseGroupId').setValue('');
      this.examFeeCollectionForm.get('courseYearId').setValue('');
      this.examFeeCollectionForm.get('subjectId').setValue('');
      this.courseYearSubjects = [];
      this.courseGroups = [];
      this.courseYears = [];
      this.students = [];
      this.selectedStudents = [];
      this.registeredStudents = [];
      this.searchText = '';
      this.searchText1 = '';
      this.searchText2 = '';
      /*----------- COURSES GROUPS -----------*/
      if (courseId != null && courseId !== undefined) {
          this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
              .subscribe(result => {
                  if (result.statusCode === 200) {
                      if (result.data.resultList && result.data.resultList !== '') {
                          this.courseGroups = result.data.resultList;
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
  }


  selectedCourseGroup(courseGroupId): void {
      this.examFeeCollectionForm.get('examId').setValue('');
      this.examFeeCollectionForm.get('courseYearId').setValue('');
      this.examFeeCollectionForm.get('subjectId').setValue('');
      this.courseYearSubjects = [];
      this.examsList = [];
      this.courseYears = [];
      this.courseYearSubjects = [];
      this.students = [];
      this.selectedStudents = [];
      this.registeredStudents = [];
      this.searchText = '';
      this.searchText1 = '';
      this.searchText2 = '';
      if (this.examFeeCollectionForm.value.courseId !== '' && courseGroupId != null) {
          this.spinner.show();
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

  selectedCourseYear(courseYearId): void{
      this.examFeeCollectionForm.get('subjectId').setValue('');
      this.examFeeCollectionForm.get('examId').setValue('');
      this.courseYearSubjects = [];
      this.examsList = [];
      this.students = [];
      this.selectedStudents = [];
      this.registeredStudents = [];
      this.searchText = '';
      this.searchText1 = '';
      this.searchText2 = '';
      if (courseYearId) {
                /*----------- Exams List -----------*/
      // this.crudService.listDetailsByTwoIds(this.examMasterUrl, this.examFeeCollectionForm.value.collegeId, this.examFeeCollectionForm.value.courseId,
      //         this.getDetailsByCollegeIdUrl, this.getDetailsByCourseIdUrl)              
      //    
          // tslint:disable-next-line: max-line-length
          this.crudService.listDetailsByFiveIdsWithSortOrder(this.examMasterUrl, this.examFeeCollectionForm.value.collegeId, this.examFeeCollectionForm.value.courseId, this.examFeeCollectionForm.value.academicYearId, 'true', 'true',
          'DESC', this.getDetailsByCollegeIdUrl, this.getDetailsByCourseIdUrl, this.getDetailsByAcademicYearIdUrl, this.isActive , 'isInternalExam', 'createdDt')
     .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200) {
                  if (result.success) {
                      this.examsList = result.data.resultList;
                      this.examData = result.data.resultList;
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
  selectedExam(courseYearId): void{
      this.examFeeCollectionForm.get('subjectId').setValue('');
      this.courseYearSubjects = [];
      this.students = [];
      this.selectedStudents = [];
      this.registeredStudents = [];
      this.searchText = '';
      this.searchText1 = '';
      this.searchText2 = '';
      /*----------- Student Subjects -----------*/
      // tslint:disable-next-line: max-line-length
      if (courseYearId) {
          this.crudService.listByFourIds(this.examCourseYearSubjectUrl, this.examFeeCollectionForm.value.collegeId, this.examFeeCollectionForm.value.academicYearId,
              courseYearId, this.examFeeCollectionForm.value.courseGroupId, 'collegeId', 'academicYearId', 'courseyearId', 'courseGroupId')
              .subscribe(response => {
        this.spinner.hide();
        if (response.statusCode === 200){
                 if (response.data && response.data !== '' && response.success !== false) {
                     this.courseYearSubjects = response.data; 
                     this.subjectsData = response.data;
                 } else {
                     this.snotifyService.success(response.message, 'Success!');
                 }
             }else {
               this.snotifyService.error(response.message, 'Error!');
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
  searchSubject(value) { 
    this.subjectsData=[]
   this.searchSub(value);
    }
  searchSub(value: string) { 
    let filter = value.toLowerCase();
    for ( let i = 0 ; i < this.courseYearSubjects.length; i++ ) {
        let option = this.courseYearSubjects[i];
        if (option.subjectName.toLowerCase().indexOf(filter) >= 0) {
            this.subjectsData.push( option );
        }
        else if (option.subjectCode.toLowerCase().indexOf(filter) >= 0) {
          this.subjectsData.push( option );
      }
    }
  }
selectedSubject(subjectId): void{
    this.students = [];
    this.selectedStudents = [];
    this.registeredStudents = [];
    this.searchText = '';
    this.searchText1 = '';
    this.searchText2 = '';
//  this.students = this.courseYearSubjectsByType.filter(x => ( x.subjectId === subjectId));
    this.dataSource = new MatTableDataSource<any>(this.students);
  
}

// tslint:disable-next-line:typedef
applyFilter(filterValue: string) {
  this.dataSource.filter = filterValue.trim().toLowerCase();

  if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
  }
}

getDetails(): void{ 
    if (this.examFeeCollectionForm.valid){
        this.spinner.show();
        this.subjectModerationStudents = [];

        this.selectedData = this.colleges.filter(x => (x.collegeId === this.examFeeCollectionForm.value.collegeId))[0].collegeCode;
        this.selectedData = this.selectedData + ' / ' + this.academicYears.filter(x => (x.academicYearId === this.examFeeCollectionForm.value.academicYearId))[0].academicYear;
        this.selectedData = this.selectedData + ' / ' + this.courses.filter(x => (x.courseId === this.examFeeCollectionForm.value.courseId))[0].courseCode;
        this. selectedData = this.selectedData + ' / ' + this.courseGroups.filter(x => (x.courseGroupId === this.examFeeCollectionForm.value.courseGroupId))[0].groupCode;
        this.selectedData = this.selectedData + ' / ' + this.courseYears.filter(x => (x.courseYearId === this.examFeeCollectionForm.value.courseYearId))[0].courseYearName;
        this.selectedData = this.selectedData + ' / ' + this.courseYearSubjects.filter(x => (x.subjectId === this.examFeeCollectionForm.value.subjectId))[0].subjectName;

        /*----------- STUDENTS -----------*/
       // tslint:disable-next-line:max-line-length
        this.crudService.listBySixIds(this.subjectWiseModerationUrl, 'GetModerationMarks', 
        this.examFeeCollectionForm.value.collegeId,
        this.examFeeCollectionForm.value.examId,
        this.examFeeCollectionForm.value.courseYearId,
        this.examFeeCollectionForm.value.courseGroupId,
        this.examFeeCollectionForm.value.subjectId,
       'in_flag', 'in_collegeid', 'in_examid', 'in_courseyearid', 'in_coursegroupid', 'in_subjectid')
         .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200){

                if (result.success) {
                       if (result.data.result[0].length > 0){
                            this.subjectModerationStudents = [];
                            for (let i = 0; i < result.data.result[0].length; i++){
                                this.subjectModerationStudents.push({
                                    hallticket_number: result.data.result[0][i].hallticket_number,
                                    StudentName: result.data.result[0][i].StudentName,
                                    external_marks: result.data.result[0][i].external_marks,
                                    internal_marks: result.data.result[0][i].internal_marks,
                                    totalmarks: result.data.result[0][i].totalmarks,
                                    is_present: result.data.result[0][i].is_present,
                                    is_pass: result.data.result[0][i].is_pass,
                                    max_marks: result.data.result[0][i].max_marks,
                                    mark_percentage: result.data.result[0][i].mark_percentage,
                                    ModerationMarks: result.data.result[0][i].ModerationMarks,
                                    applied_moderation: result.data.result[0][i].applied_moderation,
                                    ModerationMarks_added: result.data.result[0][i].ModerationMarks_added
                                  })
                            }
                            this.moderationRuleInfo = result.data.result[1]                        
                       }
                       else{
                         this.snotifyService.success('No Records Found.', 'Success!');
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
  }

goBack(): void{
  this._location.back();
}

}
