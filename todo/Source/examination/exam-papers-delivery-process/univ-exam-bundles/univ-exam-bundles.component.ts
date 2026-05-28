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

  private getCollegeExamCenters = CONSTANTS.getCollegeExamCenters;
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
  examCenterFilters = [];
  examCenterDetails = [];
 
 
constructor(private dialog: MatDialog, private snotifyService: SnotifyService, private genericFunctions: GenericFunctions,
          private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router, private formBuilder: FormBuilder) {
          this.getExamCenters();
}
 
// tslint:disable-next-line:typedef
ngOnInit() {
  this.staffForm = this.formBuilder.group({
    academicYearId:['',Validators.required],
    courseId: ['', Validators.required],
    examId: ['', Validators.required],
    univExamcenterId:['', Validators.required],
    univExamBagId:['', Validators.required],
  });
  this.dataSource = new MatTableDataSource(this.UnivExamBundleList);
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
}

getExamCenters(): void {
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'college_center_filters' },
      { paramName: 'in_flag_type', paramValue: 'REGSUP' },
      { paramName: 'in_univ_examcenter_id', paramValue: 0 },
      { paramName: 'in_exam_group_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_exam_date', paramValue: '1900-01-01' },
      { paramName: 'in_questionpaper_code', paramValue: '' },
    ];
    this.crudService.getDetailsByRequest(this.getCollegeExamCenters, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.examCenterFilters = result.data.result;
            for (let i = 0; i < this.examCenterFilters.length; i++) {
              if (this.examCenterFilters[i].length > 0 && this.examCenterFilters[i][0].flag === 'college_center_filters') {
                this.examCenterDetails = this.examCenterFilters[i];
              }
            }
            const courseList = this.examCenterDetails.map(({ fk_univ_examcenter_id }) => fk_univ_examcenter_id);
            this.univExamCenters = this.examCenterDetails.filter(({ fk_univ_examcenter_id }, index) =>
              !courseList.includes(fk_univ_examcenter_id, index + 1));
          }
          if (this.univExamCenters.length > 0) {
            this.staffForm.get('univExamcenterId').setValue(this.univExamCenters[0].fk_univ_examcenter_id);
            this.selectedExamCenter(this.staffForm.value.univExamcenterId);
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

selectedExamCenter(univExamcenterId): void {
  this.staffForm.get('courseId').setValue('');
  this.staffForm.get('examId').setValue('');
  this.staffForm.get('academicYearId').setValue('');
  this.staffForm.get('univExamBagId').setValue('');
  this.filtersDetailsList = [];
  this.CollegesListDetails = [];
  this.courses = [];
  this.academicYears=[]
  this.searchExams = [];
  this.examsList = [];
  this.searchExams = [];
  this.academicYearsList = [];
  this.examData = [];
  this.examBagsList = [];
  this.flag = false;
  this.spinner.show();
  let request = [
      { paramName: 'in_flag', paramValue: 'exam_center_clg_filters' },
      { paramName: 'in_flag_type', paramValue: 'REGSUP' },
      { paramName: 'in_univ_examcenter_id', paramValue: this.staffForm.value.univExamcenterId },
      { paramName: 'in_exam_group_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_exam_date', paramValue: '1900-01-01' },
      { paramName: 'in_questionpaper_code', paramValue: '' },
    ];
    this.crudService.getDetailsByRequest(this.getCollegeExamCenters, '', request, '&')
    .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200) {
        if (result.data && result.data !== '' && result.data.result.length > 0) {
          this.filtersDetailsList = result.data.result;
          for (let i = 0; i < this.filtersDetailsList.length; i++) {
            if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'exam_center_filters') {
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
  this.staffForm.get('examId').setValue('');
  this.staffForm.get('academicYearId').setValue('');
  this.staffForm.get('univExamBagId').setValue('');
  this.examBagsList = [];
  this.academicYears=[]
  this.searchExams = [];
  this.examsList = [];
  this.searchExams = [];
  this.academicYearsList = [];
  this.examData = [];
  this.flag = false;
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
  this.staffForm.get('examId').setValue('');
  this.staffForm.get('univExamBagId').setValue('');
  this.examBagsList = [];
  this.flag = false;
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
  this.staffForm.get('univExamBagId').setValue('');
  this.examBagsList = [];
  this.UnivExamBundleList = [];
  this.dataSource = new MatTableDataSource([]);
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
  this.examBagsList = this.examCenterDetails.filter(x => (x.fk_univ_examcenter_id === this.staffForm.value.univExamcenterId))
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
selectedExamBag(univExamBagId){
  this.UnivExamBundleList = [];
  this.dataSource = new MatTableDataSource([]);
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
}
getDetails(): void {
  this.UnivExamBundleList = [];
  this.dataSource = new MatTableDataSource([]);
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
  this.flag = true;
  this.examsName = this.examsList.filter(x => (x.fk_exam_id == this.staffForm.value.examId))[0]?.exam_name
  this.academicYearName = this.academicYears.filter(x => (x.fk_academic_year_id == this.staffForm.value.academicYearId))[0]?.academic_year
  this.courseName = this.courses.filter(x => (x.fk_course_id == this.staffForm.value.courseId))[0]?.course_code
  /*---------- GET ORGANIZATIONS --------------*/
  if(this.staffForm.value.univExamBagId === 0){
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
  }else{
    this.crudService.listDetailsByThreeIds(this.UnivExamBundleUrl,this.staffForm.value.examId,this.staffForm.value.univExamBagId,'true', 'examMaster.examId','univExamBags.univExamBagId',this.isActive )
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
  data.univExamBagId = this.staffForm.value.univExamBagId,
  data.type='new'
  const dialogRef = this.dialog.open(AddExamBundlesComponent, {
      width: '1000px',
      data: data
  });
 
  dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== ''){
          details.courseId =  this.staffForm.value.courseId,
          details.academicYearId =  this.staffForm.value.academicYearId,
          details.examId =  this.staffForm.value.examId,
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
          details.courseId =  this.staffForm.value.courseId,
          details.academicYearId =  this.staffForm.value.academicYearId,
          details.examId =  this.staffForm.value.examId,
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
