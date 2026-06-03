import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { ParametersService } from 'app/main/services/parameters.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-exam-bundle-print',
  templateUrl: './exam-bundle-print.component.html',
  styleUrls: ['./exam-bundle-print.component.scss']
})
export class ExamBundlePrintComponent implements OnInit {

 displayedColumns: string[] = ['id', 'bundleNumber', 'totalAnswerBooks', 'startEcSeatNo', 'endEcSeatNo', 'actions'];
  dataSource: MatTableDataSource<any>;
  // matColumns: string[] = ['orgCode', 'campusCode', 'campusName', 'districtName'];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private getCollegeExamCenters = CONSTANTS.getCollegeExamCenters;
  private getCollegeExamCentersUrl = CONSTANTS.getCollegeExamCentersUrl;
  private UnivExamScanbundleUrl = CONSTANTS.UnivExamScanbundleUrl;
  private getExamCenterBundleByCodeUrl = CONSTANTS.getExamCenterBundleByCodeUrl;

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
  examCenters = [];
  examDatesList = [];
  examDates = [];
  questionPaperCodes = [];
  examCentersData = [];
  examCenterCode;
  examDatesData = [];
  examDate;
  questionPaperCode;

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
    examCenterId: ['', Validators.required],
    examDate: ['', Validators.required],
    questionPaperCode: ['', Validators.required]
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
              this.selectedAcademicYear(this.staffForm.value.academicYearId);
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
  this.staffForm.get('examCenterId').setValue('');
  this.staffForm.get('examDate').setValue('');
  this.staffForm.get('questionPaperCode').setValue('');
  this.examCourseFiltersList = [];
  this.courseYearsDetails = [];
  this.courseYears = [];
  this.regulationList = [];
  this.regulations = [];
  this.examGroupList = [];
  this.examGroups = [];
  this.examCenters = [];
  this.examCentersData = [];
  this.questionPaperCodes = [];
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
  this.examDatesList = [];
  this.examDates = [];
  this.examDatesData = [];
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
  this.staffForm.get('examCenterId').setValue('');
  this.staffForm.get('examDate').setValue('');
  this.staffForm.get('questionPaperCode').setValue('');
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
  this.examCenters = [];
  this.examCentersData = [];
  this.questionPaperCodes = [];
  this.examDatesList = [];
  this.examDates = [];
  this.examDatesData = [];
  this.dataSource = new MatTableDataSource(this.scanBundlesList);
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
  this.spinner.show();
  let request = [
    { paramName: 'in_flag', paramValue: 'eg_ec_filters' },
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
            const examCenters = this.examCourseFiltersList.map(({ fk_univ_ec_id }) => fk_univ_ec_id);
              this.examCenters = this.examCourseFiltersList.filter(({ fk_univ_ec_id }, index) =>
                !examCenters.includes(fk_univ_ec_id, index + 1));
              this.examCentersData = this.examCenters;
            }
            if (this.examCenters.length > 0) {
              if(this.filtersSetArray && this.filtersSetArray.length > 0){
              this.staffForm.get('examCenterId').setValue(+this.filtersSetArray[0].examCenterId);
              this.selectedExamCenter(this.staffForm.value.examCenterId);
          }else{
            this.staffForm.get('examCenterId').setValue(this.examCenters[0].fk_univ_ec_id);
              this.selectedExamCenter(this.staffForm.value.examCenterId);
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
searchExamCenter(value) {
    this.examCentersData = [];
    this.search(value);
  }
  search(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examCenters.length; i++) {
      let option = this.examCenters[i];
      if (option.ec_name.toLowerCase().indexOf(filter) >= 0) {
        this.examCentersData.push(option);
      }
      else if (option.ec_code.toLowerCase().indexOf(filter) >= 0) {
        this.examCentersData.push(option);
      }
    }
  }
selectedExamCenter(examCenterId){
    this.staffForm.get('examDate').setValue('');
    this.staffForm.get('questionPaperCode').setValue('');
    this.examDatesList = [];
    this.examDates = [];
    this.examDatesData = [];
    this.questionPaperCodes = [];
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
    this.examDatesList = this.examCourseFiltersList.filter(x => (x.fk_univ_ec_id === this.staffForm.value.examCenterId));
         const examDate = this.examDatesList.map(({ exam_date }) => exam_date);
      this.examDates = this.examDatesList.filter(({ exam_date }, index) => !examDate.includes(exam_date, index + 1));
      this.examDatesData = this.examDates;
    if (this.examDates.length > 0) {
      if(this.filtersSetArray && this.filtersSetArray.length > 0){
         this.staffForm.get('examDate').setValue(+this.filtersSetArray[0].examDate);
         this.selectedExamDate(this.staffForm.value.examDate);
      }else{
         this.staffForm.get('examDate').setValue(this.examDates[0].exam_date);
         this.selectedExamDate(this.staffForm.value.examDate);
      }
    }
}
searchExamDate(value) {
    this.examDatesData = [];
    this.filterExamDate(value);
  }
  filterExamDate(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examDates.length; i++) {
      let option = this.examDates[i];
      if (option.exam_date.toLowerCase().indexOf(filter) >= 0) {
        this.examDatesData.push(option);
      }
    }
  }
selectedExamDate(examDate){
  this.staffForm.get('questionPaperCode').setValue('');
  this.regulationList = [];
  this.regulations = [];
  this.subjectsList = [];
  this.subjects = [];
  this.subjectsData = [];
  this.questionPaperCodes = [];
  this.printStickersData = [];
  let request = [
    { paramName: 'in_flag', paramValue: 'eg_ec_qc_filters' },
    { paramName: 'in_flag_type', paramValue: 'REGSUP' },
    { paramName: 'in_univ_examcenter_id', paramValue: this.staffForm.value.examCenterId },
    { paramName: 'in_exam_group_id', paramValue: this.staffForm.value.examGroupId },
    { paramName: 'in_college_id', paramValue: 0 },
    { paramName: 'in_course_id', paramValue: 0 },
    { paramName: 'in_course_group_id', paramValue: 0 },
    { paramName: 'in_course_year_id', paramValue: 0 },
    { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
    { paramName: 'in_exam_id', paramValue: 0 },
    { paramName: 'in_regulation_id', paramValue: 0 },
    { paramName: 'in_subject_id', paramValue: 0 },
    { paramName: 'in_university_id', paramValue: 0 },
    { paramName: 'in_exam_date', paramValue: this.staffForm.value.examDate},
    { paramName: 'in_questionpaper_code', paramValue: '' },
    ];
    this.crudService.getDetailsByRequest(this.getCollegeExamCenters, '', request, '&')
    .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200) {
        if (result.data && result.data !== '' && result.data.result.length > 0) {
          this.questionPaperCodes = result.data.result[0];
            }
            if (this.questionPaperCodes.length > 0) {
              if(this.filtersSetArray && this.filtersSetArray.length > 0){
              this.staffForm.get('questionPaperCode').setValue(+this.filtersSetArray[0].questionPaperCode);
              this.selectedQuestionPaper(this.staffForm.value.questionPaperCode);
          }else{
            this.staffForm.get('questionPaperCode').setValue(this.questionPaperCodes[0].questionPaperCode);
              this.selectedQuestionPaper(this.staffForm.value.questionPaperCode);
          }
            } else {
            //this.snotifyService.success(result.message, 'Success!');
          }
      } else {
        //this.snotifyService.error(result.message, 'Error!');
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
  selectedQuestionPaper(questionPaperCode){
    this.scanBundlesList = [];
    this.printStickersData = [];
    this.dataSource = new MatTableDataSource(this.scanBundlesList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
    headerData(){
      this.examGroupCode = this.examGroups.filter(x => (x.fk_univ_exam_group_id === this.staffForm.value.examGroupId))[0]?.exam_group_code;
      this.examCenterCode = this.examCenters.filter(x => (x.fk_univ_ec_id === this.staffForm.value.examCenterId))[0]?.ec_name;
      this.examDate = this.examDates.filter(x => (x.exam_date === this.staffForm.value.examDate))[0]?.exam_date;
      this.questionPaperCode = this.questionPaperCodes.filter(x => (x.questionpaper_code === this.staffForm.value.questionPaperCode))[0]?.questionpaper_code;
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
      if(this.staffForm.valid){
        let request = [
    { paramName: 'in_flag', paramValue: 'get_exam_bundle' },
    { paramName: 'in_flag_type', paramValue: 'REGSUP' },
    { paramName: 'in_univ_examcenter_id', paramValue: this.staffForm.value.examCenterId },
    { paramName: 'in_exam_group_id', paramValue: this.staffForm.value.examGroupId },
    { paramName: 'in_college_id', paramValue: 0 },
    { paramName: 'in_course_id', paramValue: 0 },
    { paramName: 'in_course_group_id', paramValue: 0 },
    { paramName: 'in_course_year_id', paramValue: 0 },
    { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
    { paramName: 'in_exam_id', paramValue: 0 },
    { paramName: 'in_regulation_id', paramValue: 0 },
    { paramName: 'in_subject_id', paramValue: 0 },
    { paramName: 'in_university_id', paramValue: 0 },
    { paramName: 'in_exam_date', paramValue: this.staffForm.value.examDate},
    { paramName: 'in_questionpaper_code', paramValue: this.staffForm.value.questionPaperCode },
    ];
    this.crudService.getDetailsByRequest(this.getCollegeExamCentersUrl, '', request, '&')
    .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200) {
        if (result.data && result.data !== '' && result.data.result.length > 0) {
          this.scanBundlesList = result.data.result[0];
          this.dataSource = new MatTableDataSource(this.scanBundlesList);
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
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
      }else{
          this.snotifyService.info('Please Select Required Filters', 'Info!');
      }
    }
// tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
  this.dataSource.filter = filterValue.trim().toLowerCase();

  if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
  }
}
getPrintStickersData(id){
  this.printStickersData = [];
  this.spinner.show();
  let request = [
      { paramName: 'in_flag', paramValue: 'bundle_omr_details' },
      { paramName: 'in_univ_examcenter_id', paramValue: this.staffForm.value.examCenterId },
      { paramName: 'in_exam_group_id', paramValue: this.staffForm.value.examGroupId },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_bag_id', paramValue: 0 },
      { paramName: 'in_bundle_number', paramValue: 0 },
      { paramName: 'in_bundle_id', paramValue: id },
      { paramName: 'in_start_ec_seatno', paramValue: 0 },
      { paramName: 'in_end_ec_seatno', paramValue: 0 },
      { paramName: 'in_exam_date', paramValue: this.staffForm.value.examDate },
      { paramName: 'in_questionpaper_code', paramValue: this.staffForm.value.questionPaperCode },
    ];
    this.crudService.getDetailsByRequest(this.getExamCenterBundleByCodeUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.printStickersData = result.data.result[0];

// ✅ flatten if nested
if (Array.isArray(this.printStickersData[0])) {
  this.printStickersData = this.printStickersData[0];
}
              if(this.printStickersData && this.printStickersData.length > 0){
                 this.printStickers();
              }
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
printStickers(){
        JSON.stringify(this.printStickersData)
        this.router.navigate(['admin-examination-management/exam-papers-delivery-process/exam-bundle-print/exam-bundle-print-stickers'],
        {
            queryParams: {
            data: JSON.stringify(this.printStickersData),
            examGroupCode: this.examGroupCode,
            printHn: true,
            academicYearId : this.staffForm.value.academicYearId,
            examGroupId : this.staffForm.value.examGroupId,
            examCenterId : this.staffForm.value.examCenterId,
            examDate : this.staffForm.value.examDate,
            questionPaperCode : this.staffForm.value.questionPaperCode,
            }
        });
    }
getPrintStickersDataNew(id){
  this.printStickersData = [];
  this.spinner.show();
  let request = [
      { paramName: 'in_flag', paramValue: 'bundle_omr_details' },
      { paramName: 'in_univ_examcenter_id', paramValue: this.staffForm.value.examCenterId },
      { paramName: 'in_exam_group_id', paramValue: this.staffForm.value.examGroupId },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_bag_id', paramValue: 0 },
      { paramName: 'in_bundle_number', paramValue: 0 },
      { paramName: 'in_bundle_id', paramValue: id },
      { paramName: 'in_start_ec_seatno', paramValue: 0 },
      { paramName: 'in_end_ec_seatno', paramValue: 0 },
      { paramName: 'in_exam_date', paramValue: this.staffForm.value.examDate },
      { paramName: 'in_questionpaper_code', paramValue: this.staffForm.value.questionPaperCode },
    ];
    this.crudService.getDetailsByRequest(this.getExamCenterBundleByCodeUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.printStickersData = result.data.result[0];

// ✅ flatten if nested
if (Array.isArray(this.printStickersData[0])) {
  this.printStickersData = this.printStickersData[0];
}
              if(this.printStickersData && this.printStickersData.length > 0){
                 this.printStickersNew();
              }
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
printStickersNew(){
        JSON.stringify(this.printStickersData)
        this.router.navigate(['admin-examination-management/exam-papers-delivery-process/exam-bundle-print/exam-bundle-print-stickers-gu'],
        {
            queryParams: {
            data: JSON.stringify(this.printStickersData),
            examGroupCode: this.examGroupCode,
            printHn: true,
            academicYearId : this.staffForm.value.academicYearId,
            examGroupId : this.staffForm.value.examGroupId,
            examCenterId : this.staffForm.value.examCenterId,
            examDate : this.staffForm.value.examDate,
            questionPaperCode : this.staffForm.value.questionPaperCode,
            }
        });
    }
}
