import {Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { CONSTANTS } from 'app/main/common/constants';
import { CrudService } from 'app/main/services/crud.service';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AddExamBundlesComponent } from './add-exam-bundles/add-exam-bundles.component';

@Component({
  selector: 'app-univ-exam-bundles',
  templateUrl: './univ-exam-bundles.component.html',
  styleUrls: ['./univ-exam-bundles.component.scss']
})
export class UnivExamBundlesComponent implements OnInit {
  displayedColumns: string[] = ['id',  'bagSerialNo','bundleNumber','startSerialNo', 'endSerialNo','totalAnswerBooks','isActive',  'actions'];
  dataSource: MatTableDataSource<any>;
 
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
 
  private UnivExamBundleUrl = CONSTANTS.UnivExamBundleUrl;
  private collegewisedetailsUrl = CONSTANTS.collegewisedetailsUrl;
  private isActive = CONSTANTS.isActive;
  UnivExamBundleList =[]
  examBagsList= [];
  campus: any = {};
  filtersDetailsList: any;
  CollegesListDetails: any;
  courses: any;
  staffForm: FormGroup;
  academicYearsList: any;
  searchExams: any[];
  examsList: any[];
  academicYears: any[];
  examData: any[];
  examsLists: any[];
  panelOpenState = true;
  step = 0;
  univExamCenters: any;
  flag: boolean =false;
  examsName: any;
  academicYearName: any;
  courseName: any;
 
 
constructor(private dialog: MatDialog, private snotifyService: SnotifyService, private genericFunctions: GenericFunctions,
          private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router, private formBuilder: FormBuilder,) {
 
         
         this.getFiltersList();
}
 
// tslint:disable-next-line:typedef
ngOnInit() {
  this.staffForm = this.formBuilder.group({
    academicYearId:['',Validators.required],
    courseId: ['', Validators.required],
    examId: ['', Validators.required],
    univExamcenterId:['', Validators.required],
  });
  this.dataSource = new MatTableDataSource(this.UnivExamBundleList);
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
}
 
getFiltersList(): void {
  this.spinner.show();
  let request = [
    { paramName: 'in_flag', paramValue: 'clg_exam_timetable_filters' },
    { paramName: 'in_org_id', paramValue: +localStorage.getItem('organizationId') },
    { paramName: 'in_college_id', paramValue: 0 },
    { paramName: 'in_course_id', paramValue: 0 },
    { paramName: 'in_course_group_id', paramValue: 0 },
    { paramName: 'in_course_year_id', paramValue: 0 },
    { paramName: 'in_group_section_id', paramValue: 0 },
    { paramName: 'in_academic_year_id', paramValue: 0 },
    { paramName: 'in_dept_id', paramValue: 0 },
    { paramName: 'in_isadmin', paramValue: 0 },
    { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
    { paramName: 'in_loginuser_roleid', paramValue: 0 },
    { paramName: 'in_employee', paramValue: '' },
    { paramName: 'in_subject', paramValue: '' },
    { paramName: 'in_gm_codes', paramValue: '' },
  ];
  this.crudService.getDetailsByRequest(this.collegewisedetailsUrl, '', request, '&')
    .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200) {
        if (result.data && result.data !== '' && result.data.result.length > 0) {
          this.filtersDetailsList = result.data.result;
          for (let i = 0; i < this.filtersDetailsList.length; i++) {
            if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'clg_exam_timetable_filters') {
              this.CollegesListDetails = this.filtersDetailsList[i];
            }
          }
 
          const courseList = this.CollegesListDetails.map(({ fk_course_id }) => fk_course_id);
          this.courses = this.CollegesListDetails.filter(({ fk_course_id }, index) =>
            !courseList.includes(fk_course_id, index + 1));
        }
        if (this.courses.length > 0) {
          this.staffForm.get('courseId').setValue(this.courses[0].fk_course_id);
          this.selectedCourse(this.staffForm.value.courseId);
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
 
 
// tslint:disable-next-line:typedef
selectedCourse(courseId) {
  this.staffForm.get('examId').setValue(0);
  this.staffForm.get('academicYearId').setValue(0);
  this.academicYears=[]
  this.searchExams = [];
  this.examsList = [];
  this.searchExams = [];
  this.academicYearsList = [];
  this.examData = [];
  this.academicYearsList = this.CollegesListDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId))
  if (this.academicYearsList.length > 0) {
    const academicYearsList = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
    this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYearsList.includes(fk_academic_year_id, index + 1));
 
  }
  if (this.academicYears.length > 0) {
    this.staffForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
    this.selectedAcademicYear(this.staffForm.value.academicYearId)
  }
}
selectedAcademicYear(academicYearId){
  this.flag=false
  this.staffForm.get('examId').setValue(0);
  this.searchExams = [];
  this.examsList = [];
  this.searchExams = [];
  this.examsLists = [];
  this.examData = [];
  this.examsLists = this.CollegesListDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId && x.fk_academic_year_id == this.staffForm.value.academicYearId))
  if (this.examsLists.length > 0) {
    const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
    this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
    this.examsList = this.examsList.filter(x => !x.is_internal_exam)
    this.examData = this.examsList;
  }
  if (this.examsList.length > 0) {
    this.staffForm.get('examId').setValue(this.examsList[0].fk_exam_id);
    // this.selectedExam(this.examsList[0].fk_exam_id)
  }
}
selectedExam(examId){
  this.UnivExamBundleList=[]
}
searchExam(value) {
  this.examData = [];
  this.examSearch(value);
}
examSearch(value: string) {
  let filter = value.toLowerCase()
  for (let i = 0; i < this.examsList.length; i++) {
    let option = this.examsList[i];
    if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
      this.examData.push(option);
    }
  }
}
 
getDetails(): void {
  this.flag=true
  this.examsName = this.examsList.filter(x => (x.fk_exam_id == this.staffForm.value.examId))[0]?.exam_name
  this.academicYearName = this.academicYears.filter(x => (x.fk_academic_year_id == this.staffForm.value.academicYearId))[0]?.academic_year
  this.courseName = this.courses.filter(x => (x.fk_course_id == this.staffForm.value.courseId))[0]?.course_code

  /*---------- GET ORGANIZATIONS --------------*/
  this.crudService.listDetailsByTwoIds(this.UnivExamBundleUrl,this.staffForm.value.examId ,'true', 'examMaster.examId',this.isActive )
      .subscribe(result => {
          if (result.statusCode === 200) {
              if (result.data.resultList && result.data.resultList !== '') {
                  this.UnivExamBundleList = result.data.resultList;
                  this.dataSource = new MatTableDataSource(this.UnivExamBundleList);
                  this.dataSource.paginator = this.paginator;
                  this.dataSource.sort = this.sort;
              } else {
                  this.snotifyService.success(result.message, 'Success!');
              }
          } else {
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
 
// tslint:disable-next-line: typedef
dashboardUrl(){
   this.genericFunctions.dashboardHome(localStorage.getItem('userTypeCode'));
}
 


// tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
  this.dataSource.filter = filterValue.trim().toLowerCase();
 
  if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
  }
}
 
openDialog(): void {
  const data: any = {};
  data.courseId =  this.staffForm.value.courseId,
  data.academicYearId =  this.staffForm.value.academicYearId,
  data.examId =  this.staffForm.value.examId,
  data.type='new'
  const dialogRef = this.dialog.open(AddExamBundlesComponent, {
      width: '1000px',
      data: data
  });
 
  dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== ''){
          this.spinner.show();
 
          /*---------- ADD CAMPUS ----------*/
          this.crudService.addDetails(this.UnivExamBundleUrl, details)
              .subscribe(result => {
                  this.spinner.hide();
                  if (result.statusCode === 200){
                      if (result.data && result.data !== '') {
                          this.snotifyService.success(result.message, 'Success!');
                          this.getDetails();

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
  });
}
 
/*---------- EDIT CAMPUS -----------*/
editDialog(data): void {
  data.courseId =  this.staffForm.value.courseId,
  data.academicYearId =  this.staffForm.value.academicYearId,
  data.examId =  this.staffForm.value.examId,
  this.campus = data;
  const dialogRef = this.dialog.open(AddExamBundlesComponent, {
  width: '1000px',
  data: this.campus
  });
 
  dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== ''){
          details.unvExamBundleId = data.unvExamBundleId;
          this.updatedetails(details);
      }
  });
}
 
/*------------ UPDATE CAMPUS -----------*/
updatedetails(details): void{
      this.spinner.show();
      this.crudService.updateDetailsById(this.UnivExamBundleUrl, details, details.unvExamBundleId, 'unvExamBundleId')
      .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200){
              if (result.data && result.data !== '') {
                  this.snotifyService.success(result.message, 'Success!');
                  this.getDetails();
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
