import {Component, OnInit, ViewChild} from '@angular/core';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { CONSTANTS } from 'app/main/common/constants';
import { CrudService } from 'app/main/services/crud.service';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ScanBundlesModalComponent } from './scan-bundles-modal/scan-bundles-modal.component';
import { ParametersService } from 'app/main/services/parameters.service';

@Component({
  selector: 'app-scan-bundles',
  templateUrl: './scan-bundles.component.html',
  styleUrls: ['./scan-bundles.component.scss']
})
export class ScanBundlesComponent implements OnInit {

  displayedColumns: string[] = ['id', 'bundleNumber', 'scannerProfileDetailId', 'totalAnswerBooks', 'startEcSeatNo', 'endEcSeatNo', 'isActive',  'actions'];
  dataSource: MatTableDataSource<any>;
  // matColumns: string[] = ['orgCode', 'campusCode', 'campusName', 'districtName'];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private getCollegeExamCenters = CONSTANTS.getCollegeExamCenters;
  private UnivExamScanbundleUrl = CONSTANTS.UnivExamScanbundleUrl;
  private getPopExamCenterScanDetailsUrl = CONSTANTS.getPopExamCenterScanDetailsUrl;
  private getExamCenterScanByCodeUrl = CONSTANTS.getExamCenterScanByCodeUrl;

  scanBundlesList = [];
  filtersDetailsList: any;
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
  examTimetableId: any;
  flag=false;
  examCenterFilters = [];
  examCenterDetails = [];
  examGroupList = [];
  examGroups = [];
  examCourseFiltersList = [];
  courseYearsDetails = [];
  courseYears = [];
  regulationList = [];
  regulations = [];
  subjectsList = [];
  subjects = [];
  subjectsData = [];
  examGroupCode;
  courseYearCode;
  regulationCode;
  subjectCode;
  printStickersData = [];
  filtersSetArray = [];

constructor(private dialog: MatDialog, private snotifyService: SnotifyService, private genericFunctions: GenericFunctions,
          private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router, private formBuilder: FormBuilder,
          private parameterService: ParametersService) {
          this.getExamGroupDetails();
}

// tslint:disable-next-line:typedef
ngOnInit() {
  this.staffForm = this.formBuilder.group({
    academicYearId:['', Validators.required],
    examGroupId:['', Validators.required],
    courseId:['', Validators.required],
    courseYearId:['', Validators.required],
    regulationId:['', Validators.required],
    subjectId:['', Validators.required]
  });
  this.dataSource = new MatTableDataSource(this.scanBundlesList); 
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
  console.log(this.parameterService.examScanBundlesFiltersData,"examScanBundlesFiltersData")
  if(this.parameterService.examScanBundlesFiltersData && this.parameterService.examScanBundlesFiltersData.length > 0){
     this.filtersSetArray = this.parameterService.examScanBundlesFiltersData;
  }
}

getExamGroupDetails(): void {
  this.spinner.show();
  let request = [
    { paramName: 'in_flag', paramValue: 'eg_filters' },
    { paramName: 'in_flag_type', paramValue: 'REGSUP' },
    { paramName: 'in_univ_examcenter_id', paramValue: 0 },
    { paramName: 'in_exam_group_id', paramValue: 0 },
    { paramName: 'in_college_id', paramValue: 0 },
    { paramName: 'in_course_id', paramValue: 0 },
    { paramName: 'in_course_group_id', paramValue: 0 },
    { paramName: 'in_course_year_id', paramValue: 0 },
    { paramName: 'in_academic_year_id', paramValue: 0 },
    { paramName: 'in_exam_id', paramValue: 0 },
    { paramName: 'in_academic_year_id', paramValue: 0 },
    { paramName: 'in_regulation_id', paramValue: 0 },
    { paramName: 'in_subject_id', paramValue: 0 },
    { paramName: 'in_university_id', paramValue: 0 },
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
              if (this.examCenterFilters[i].length > 0 && this.examCenterFilters[i][0].flag === 'eg_ay_filter') {
                this.examCenterDetails = this.examCenterFilters[i];
              }
            }
            const academicYearList = this.examCenterDetails.map(({ fk_academic_year_id }) => fk_academic_year_id);
              this.academicYears = this.examCenterDetails.filter(({ fk_academic_year_id }, index) =>
                !academicYearList.includes(fk_academic_year_id, index + 1));
            }
            if (this.academicYears.length > 0) {
                if(this.filtersSetArray && this.filtersSetArray.length > 0){
              this.staffForm.get('academicYearId').setValue(+this.filtersSetArray[0].academicYearId);
              this.selectedAcademicYear(this.staffForm.value.univExamcenterId);
          }else{
              this.staffForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
              this.selectedAcademicYear(this.staffForm.value.academicYearId);
          }
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

selectedAcademicYear(academicYearId){
  this.staffForm.get('examGroupId').setValue('');
  this.staffForm.get('courseId').setValue('');
  this.staffForm.get('courseYearId').setValue('');
  this.staffForm.get('regulationId').setValue('');
  this.staffForm.get('subjectId').setValue('');
  this.examCourseFiltersList = [];
  this.courseYearsDetails = [];
  this.courseYears = [];
  this.regulationList = [];
  this.regulations = [];
  this.examGroupList = [];
  this.examGroups = [];
  this.searchExams = [];
  this.examsList = [];
  this.searchExams = [];
  this.examsLists = [];
  this.examData = [];
  this.subjectsList = [];
  this.subjects = [];
  this.subjectsData = [];
  this.scanBundlesList = [];
  this.printStickersData = [];
  this.dataSource = new MatTableDataSource(this.scanBundlesList);
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
  this.examGroupList = this.examCenterDetails.filter(x => (x.fk_academic_year_id == this.staffForm.value.academicYearId))
  if (this.examGroupList.length > 0) {
    const examGroupList = this.examGroupList.map(({ fk_univ_exam_group_id }) => fk_univ_exam_group_id);
    this.examGroups = this.examGroupList.filter(({ fk_univ_exam_group_id }, index) => !examGroupList.includes(fk_univ_exam_group_id, index + 1));
  }
  if (this.examGroups.length > 0) {
    if(this.filtersSetArray && this.filtersSetArray.length > 0){
              this.staffForm.get('examGroupId').setValue(+this.filtersSetArray[0].examGroupId);
              this.selectedExamGroup(this.staffForm.value.examGroupId);
          }else{
            this.staffForm.get('examGroupId').setValue(this.examGroups[0].fk_univ_exam_group_id);
    this.selectedExamGroup(this.examGroups[0].fk_univ_exam_group_id)
          }
  }
}

selectedExamGroup(examGroupId): void {
  this.staffForm.get('courseId').setValue('');
  this.staffForm.get('courseYearId').setValue('');
  this.staffForm.get('regulationId').setValue('');
  this.staffForm.get('subjectId').setValue('');
  this.examCourseFiltersList = [];
  this.courseYearsDetails = [];
  this.courseYears = [];
  this.regulationList = [];
  this.regulations = [];
  this.searchExams = [];
  this.examsList = [];
  this.searchExams = [];
  this.examsLists = [];
  this.examData = [];
  this.subjectsList = [];
  this.subjects = [];
  this.subjectsData = [];
  this.scanBundlesList = [];
  this.printStickersData = [];
  this.dataSource = new MatTableDataSource(this.scanBundlesList);
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
  this.spinner.show();
  let request = [
    { paramName: 'in_flag', paramValue: 'eg_scan_filter' },
    { paramName: 'in_flag_type', paramValue: 'REGSUP' },
    { paramName: 'in_univ_examcenter_id', paramValue: 0 },
    { paramName: 'in_exam_group_id', paramValue: this.staffForm.value.examGroupId },
    { paramName: 'in_college_id', paramValue: 0 },
    { paramName: 'in_course_id', paramValue: 0 },
    { paramName: 'in_course_group_id', paramValue: 0 },
    { paramName: 'in_course_year_id', paramValue: 0 },
    { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
    { paramName: 'in_exam_id', paramValue: 0 },
    { paramName: 'in_academic_year_id', paramValue: 0 },
    { paramName: 'in_regulation_id', paramValue: 0 },
    { paramName: 'in_subject_id', paramValue: 0 },
    { paramName: 'in_university_id', paramValue: 0 },
    { paramName: 'in_exam_date', paramValue: '1900-01-01' },
    { paramName: 'in_questionpaper_code', paramValue: '' },
    ];
    this.crudService.getDetailsByRequest(this.getCollegeExamCenters, '', request, '&')
    .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200) {
        if (result.data && result.data !== '' && result.data.result.length > 0) {
          this.examCourseFiltersList = result.data.result[0];
            const courseList = this.examCourseFiltersList.map(({ fk_course_id }) => fk_course_id);
              this.courses = this.examCourseFiltersList.filter(({ fk_course_id }, index) =>
                !courseList.includes(fk_course_id, index + 1));
            }
            if (this.courses.length > 0) {
              if(this.filtersSetArray && this.filtersSetArray.length > 0){
              this.staffForm.get('courseId').setValue(+this.filtersSetArray[0].courseId);
              this.selectedCourse(this.staffForm.value.courseId);
          }else{
            this.staffForm.get('courseId').setValue(this.courses[0].fk_course_id);
              this.selectedCourse(this.staffForm.value.courseId);
          }
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
selectedCourse(courseId){
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('regulationId').setValue('');
    this.staffForm.get('subjectId').setValue('');
    this.courseYearsDetails = [];
    this.courseYears = [];
    this.regulationList = [];
    this.regulations = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.scanBundlesList = [];
    this.printStickersData = [];
    this.dataSource = new MatTableDataSource(this.scanBundlesList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.courseYearsDetails = this.examCourseFiltersList.filter(x => (x.fk_course_id === this.staffForm.value.courseId));
         const courseYearsDetails = this.courseYearsDetails.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsDetails.filter(({ fk_course_year_id }, index) => !courseYearsDetails.includes(fk_course_year_id, index + 1));
    if (this.courseYears.length > 0) {
      if(this.filtersSetArray && this.filtersSetArray.length > 0){
         this.staffForm.get('courseYearId').setValue(+this.filtersSetArray[0].courseYearId);
         this.selectedYear(this.staffForm.value.courseYearId);
      }else{
         this.staffForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
         this.selectedYear(this.staffForm.value.courseYearId);
      }
    }
}
selectedYear(courseYearId){
  this.staffForm.get('regulationId').setValue('');
  this.staffForm.get('subjectId').setValue('');
  this.regulationList = [];
  this.regulations = [];
  this.subjectsList = [];
  this.subjects = [];
  this.subjectsData = [];
  this.printStickersData = [];
  this.regulationList = this.examCourseFiltersList.filter(x => (x.fk_course_id === this.staffForm.value.courseId && x.fk_course_year_id === this.staffForm.value.courseYearId));
  const regulationDetails = this.regulationList.map(({ fk_regulation_id }) => fk_regulation_id);
      this.regulations = this.regulationList.filter(({ fk_regulation_id }, index) => !regulationDetails.includes(fk_regulation_id, index + 1));
    if (this.regulations.length > 0) {
      if(this.filtersSetArray && this.filtersSetArray.length > 0){
              this.staffForm.get('regulationId').setValue(+this.filtersSetArray[0].regulationId);
              this.selectedRegulation(this.staffForm.value.regulationId);
          }else{
            this.staffForm.get('regulationId').setValue(this.regulations[0].fk_regulation_id);
      this.selectedRegulation(this.staffForm.value.regulationId);
          }
    }
}
selectedRegulation(regulationId){
      this.staffForm.get('subjectId').setValue('');
      this.subjectsList = [];
      this.subjects = [];
      this.subjectsData = [];
      this.scanBundlesList = [];
      this.printStickersData = [];
      this.dataSource = new MatTableDataSource(this.scanBundlesList);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
      this.subjectsList = this.examCourseFiltersList.filter(x => (x.fk_course_id === this.staffForm.value.courseId && x.fk_course_year_id === this.staffForm.value.courseYearId && x.fk_regulation_id === this.staffForm.value.regulationId));
      if (this.subjectsList && this.subjectsList.length > 0) {
        const courseCodeData = this.subjectsList.map(({ fk_subject_id }) => fk_subject_id);
        this.subjects = this.subjectsList.filter(({ fk_subject_id }, index) =>
          !courseCodeData.includes(fk_subject_id, index + 1));
        this.subjectsData = this.subjects;
      }
      if (this.subjects && this.subjects.length > 0) {
        if(this.filtersSetArray && this.filtersSetArray.length > 0){
           this.staffForm.get('subjectId').setValue(+this.filtersSetArray[0]?.subjectId);
           this.selectedSubject();
           this.getScanBundles();
        }else{
           this.staffForm.get('subjectId').setValue(this.subjects[0]?.fk_subject_id);
           this.selectedSubject();
        }
      }
}
  selectedSubject(){
  this.scanBundlesList = [];
  this.printStickersData = [];
  this.dataSource = new MatTableDataSource(this.scanBundlesList);
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
  }
    headerData(){
      this.examGroupCode = this.examGroups.filter(x => (x.fk_univ_exam_group_id === this.staffForm.value.examGroupId))[0]?.exam_group_code;
      this.courseYearCode = this.courseYears.filter(x => (x.fk_course_year_id === this.staffForm.value.courseYearId))[0]?.course_year_code;
      this.regulationCode = this.regulations.filter(x => (x.fk_regulation_id === this.staffForm.value.regulationId))[0]?.regulation_code;
      this.subjectCode = this.subjects.filter(x => (x.fk_subject_id === this.staffForm.value.subjectId))[0]?.subject_code;
    }
    getScanBundles(): void{
      this.flag = true;
      this.scanBundlesList = [];
      this.printStickersData = [];
      this.dataSource = new MatTableDataSource(this.scanBundlesList);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
      this.spinner.show();
      this.headerData();
      this.crudService.listDetailsByFiveIds(this.UnivExamScanbundleUrl, this.staffForm.value.examGroupId, this.staffForm.value.courseYearId,
      this.staffForm.value.regulationId, this.staffForm.value.subjectId, 'true', 'univExamGroup.univExamGroupId', 'courseYear.courseYearId', 'regulation.regulationId',
      'subject.subjectId', 'isActive')
      .subscribe(result => {
         this.spinner.hide();
         if (result.statusCode === 200){
              if (result.data.resultList && result.data.resultList !== '') {
                  this.scanBundlesList = result.data.resultList;
                  this.dataSource = new MatTableDataSource(this.scanBundlesList);
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
// tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
  this.dataSource.filter = filterValue.trim().toLowerCase();

  if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
  }
}
openDialog(){
    const data = this.staffForm.value;
    data.examGroupCode = this.examGroupCode;
      data.courseYearCode = this.courseYearCode;
      data.regulationCode = this.regulationCode;
      data.subjectCode = this.subjectCode;
      let request = this.subjects.filter(x => (x.fk_subject_id === this.staffForm.value.subjectId))[0];
    const dialogRef = this.dialog.open(ScanBundlesModalComponent, {
      width: '900px',
      data: data
    });
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
          details.univExamGroupId = this.staffForm.value.examGroupId;
          details.courseYearId = this.staffForm.value.courseYearId;
          details.regulationId = this.staffForm.value.regulationId;
          details.subjectId = this.staffForm.value.subjectId;
          details.examId = request?.fk_exam_id,
          details.examTimetableDetId = request?.fk_exam_timetable_det_id,
        this.spinner.show();
                /*---------- ADD EXAM GRADE ----------*/
                this.crudService.addDetails(this.UnivExamScanbundleUrl, details)
                  .subscribe(result => {
                    this.spinner.hide();
                    if (result.statusCode === 200) {
                      if (result.data && result.data !== '') {
                        this.snotifyService.success(result.message, 'Success!');
                        this.getScanBundles();
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
    });
}
editDialog(row){
    row.examGroupId = this.staffForm.value.examGroupId;
    const dialogRef = this.dialog.open(ScanBundlesModalComponent, {
      width: '850px',
      data: row
    });
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
          details.univExamScanbundleId = row.univExamScanbundleId;
          details.univExamGroupId = this.staffForm.value.examGroupId;
          details.courseYearId = this.staffForm.value.courseYearId;
          details.regulationId = this.staffForm.value.regulationId;
          details.subjectId = this.staffForm.value.subjectId;
          this.updateDetails(details);
      }
    });
}
updateDetails(details){
this.spinner.show();
        this.crudService.updateDetails(this.UnivExamScanbundleUrl, details, details.univExamScanbundleId, 'univExamScanbundleId')
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.data && result.data !== '') {
                        this.snotifyService.success(result.message, 'Success!');
                        this.getScanBundles();
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
assignStudents(row){
    row.academicYearId = this.staffForm.value.academicYearId;
    row.examGroupId = this.staffForm.value.examGroupId;
    row.courseId = this.staffForm.value.courseId;
    console.log(row,"row");
    this.parameterService.examScanBundleDetails = [row];
    this.router.navigate(['admin-examination-management/exam-papers-delivery-process/scan-bundle-details'])
}
populate(id){
  this.printStickersData = [];
  this.spinner.show();
  let request = [
      { paramName: 'in_flag', paramValue: 'pop_scan_bundle_omr_details' },
      { paramName: 'in_univ_examcenter_id', paramValue: 0 },
      { paramName: 'in_exam_group_id', paramValue: this.staffForm.value.examGroupId },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: this.staffForm.value.courseYearId },
      { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
      { paramName: 'in_subject_id', paramValue: this.staffForm.value.subjectId },
      { paramName: 'in_regulation_id', paramValue: this.staffForm.value.regulationId },
      { paramName: 'in_bundle_number', paramValue: 0 },
      { paramName: 'in_scan_bundle_id', paramValue: id },
      { paramName: 'in_start_ec_seatno', paramValue: 0 },
      { paramName: 'in_end_ec_seatno', paramValue: 0 },
    ];
    this.crudService.getDetailsByRequest(this.getPopExamCenterScanDetailsUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.snotifyService.success(result.message, 'Success!');
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
getPrintStickersData(id){
  this.printStickersData = [];
  this.spinner.show();
  let request = [
      { paramName: 'in_flag', paramValue: 'scan_bundle_omr_details' },
      { paramName: 'in_univ_examcenter_id', paramValue: 0 },
      { paramName: 'in_exam_group_id', paramValue: this.staffForm.value.examGroupId },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: this.staffForm.value.courseYearId },
      { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
      { paramName: 'in_subject_id', paramValue: this.staffForm.value.subjectId },
      { paramName: 'in_regulation_id', paramValue: this.staffForm.value.regulationId },
      { paramName: 'in_bundle_number', paramValue: 0 },
      { paramName: 'in_scan_bundle_id', paramValue: id },
      { paramName: 'in_start_ec_seatno', paramValue: 0 },
      { paramName: 'in_end_ec_seatno', paramValue: 0 },
      { paramName: 'in_exam_date', paramValue: '1900-01-01' },
      { paramName: 'in_questionpaper_code', paramValue: '' },
    ];
    this.crudService.getDetailsByRequest(this.getExamCenterScanByCodeUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.printStickersData = result.data.result[0];
              if(this.printStickersData && this.printStickersData.length > 0){
                 this.printStickers();
              }
              // this.snotifyService.success(result.message, 'Success!');
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
printStickers(){
        JSON.stringify(this.printStickersData)
        this.router.navigate(['admin-examination-management/exam-papers-delivery-process/scan-bundles/print-stickers'],
        {
            queryParams: {
            data: JSON.stringify(this.printStickersData),
            examGroupCode: this.examGroupCode,
            printHn: true,
            academicYearId : this.staffForm.value.academicYearId,
            examGroupId : this.staffForm.value.examGroupId,
            courseId : this.staffForm.value.courseId,
            courseYearId : this.staffForm.value.courseYearId,
            regulationId : this.staffForm.value.regulationId,
            subjectId : this.staffForm.value.subjectId,
            }
        });
    }
}
