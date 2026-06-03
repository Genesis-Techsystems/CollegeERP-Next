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
import { ParametersService } from 'app/main/services/parameters.service';
import { isEmpty } from 'lodash';
import *  as moment from 'moment';

@Component({
  selector: 'app-exam-center-subject-attendance',
  templateUrl: './exam-center-subject-attendance.component.html',
  styleUrls: ['./exam-center-subject-attendance.component.scss']
})
export class ExamCenterSubjectAttendanceComponent implements OnInit {

  displayedColumns: string[] = ['id', 'hallTicketNo', 'omrSerialNo', 'ecSeatNo', 'subjectCode', 'isPresent', 'mark', 'isufm'];
  dataSource: MatTableDataSource<any>;
  // matColumns: string[] = ['orgCode', 'campusCode', 'campusName', 'districtName'];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private getCollegeExamCenters = CONSTANTS.getCollegeExamCenters;
  private getExamCenterBundleByCodeUrl = CONSTANTS.getExamCenterBundleByCodeUrl;
  private examStudentDetailsUrl = CONSTANTS.examStudentDetailsUrl;

  examCenterStudentsList = [];
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
  absents = [];
  check = true;
  examCenterStudentsList1: any[] = [];

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
  this.dataSource = new MatTableDataSource(this.examCenterStudentsList); 
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
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
  this.examCenterStudentsList = [];
  this.printStickersData = [];
  this.examDatesList = [];
  this.examDates = [];
  this.examDatesData = [];
  this.absents = [];
  this.dataSource = new MatTableDataSource(this.examCenterStudentsList);
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
  this.examCenterStudentsList = [];
  this.printStickersData = [];
  this.examCenters = [];
  this.examCentersData = [];
  this.questionPaperCodes = [];
  this.examDatesList = [];
  this.examDates = [];
  this.examDatesData = [];
  this.absents = [];
  this.dataSource = new MatTableDataSource(this.examCenterStudentsList);
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
    this.examCenterStudentsList = [];
    this.printStickersData = [];
    this.absents = [];
    this.dataSource = new MatTableDataSource(this.examCenterStudentsList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.examDatesList = this.examCourseFiltersList.filter(x => (x.fk_univ_ec_id === this.staffForm.value.examCenterId));
         const examDate = this.examDatesList.map(({ exam_date }) => exam_date);
      this.examDates = this.examDatesList.filter(({ exam_date }, index) => !examDate.includes(exam_date, index + 1));
      this.examDatesData = this.examDates;
    if (this.examDates.length > 0) {
      if(this.filtersSetArray && this.filtersSetArray.length > 0){
         this.staffForm.get('examDate').setValue(this.filtersSetArray[0].examDate);
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
  this.absents = [];
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
                  this.staffForm.get('questionPaperCode').setValue(this.filtersSetArray[0].questionPaperCode);
                  this.selectedQuestionPaper(this.staffForm.value.questionPaperCode);
          }else{
                  this.staffForm.get('questionPaperCode').setValue(this.questionPaperCodes[0].questionPaperCode);
                  this.selectedQuestionPaper(this.staffForm.value.questionPaperCode);
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
  selectedQuestionPaper(questionPaperCode){
    this.examCenterStudentsList = [];
    this.printStickersData = [];
    this.absents = [];
    this.dataSource = new MatTableDataSource(this.examCenterStudentsList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    if(this.filtersSetArray && this.filtersSetArray.length > 0){
                  this.getStudentsList();
          }
  }
    headerData(){      
      this.examGroupCode = this.examGroups.filter(x => (x.fk_univ_exam_group_id === this.staffForm.value.examGroupId))[0]?.exam_group_code;
      this.examCenterCode = this.examCenters.filter(x => (x.fk_univ_ec_id === this.staffForm.value.examCenterId))[0]?.ec_name;
      this.examDate = this.examDates.filter(x => (x.exam_date === this.staffForm.value.examDate))[0]?.exam_date;
      this.questionPaperCode = this.questionPaperCodes.filter(x => (x.questionpaper_code === this.staffForm.value.questionPaperCode))[0]?.questionpaper_code;
    }
    getStudentsList(): void{
      this.flag = true;
      this.examCenterStudentsList = [];
      this.printStickersData = [];
      this.absents = [];
      this.dataSource = new MatTableDataSource(this.examCenterStudentsList);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
      this.spinner.show();
      this.headerData();
      if(this.staffForm.valid){
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
      { paramName: 'in_bundle_id', paramValue: 0 },
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
          this.examCenterStudentsList = result.data.result[0];
          for (let i = 0; i < this.examCenterStudentsList.length; i++) {
                if (this.examCenterStudentsList[i].is_present == false) {
                  this.absents.push(this.examCenterStudentsList[i])
                }
                if (this.examCenterStudentsList[i].is_present == null) {
                  this.examCenterStudentsList[i].is_present = true
                }
                if (this.examCenterStudentsList[i].isufm == null) {
                  this.examCenterStudentsList[i].isufm = false
                }
              }
          this.dataSource = new MatTableDataSource(this.examCenterStudentsList);
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
  markItems(): void {
    this.absents = [];
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.examCenterStudentsList.length; i++) {
      if (!this.check) {
        this.examCenterStudentsList[i].checked = true;
        this.examCenterStudentsList[i].is_present = true;
      } else {
        this.examCenterStudentsList[i].checked = false;
        this.examCenterStudentsList[i].is_present = false;
        this.absents.push(this.examCenterStudentsList[i]);
      }
    }
  }
    checkedItems(check, index, item): void {
    if (isEmpty(this.absents)) {
      this.absents = [];
    }
    for (let i = 0; i < this.absents.length; i++) {
      if (this.absents[i].hallticket_number === item.hallticket_number) {
        this.absents.splice(i, 1)
      }
    }
    if (item.is_present == true) {
      this.absents.push(item)
    }
  }
  addAttendance(): void {
    this.examCenterStudentsList1 = [];
    for (let i = 0; i < this.examCenterStudentsList.length; i++) {
      this.examCenterStudentsList1.push({
        examStdDetId: this.examCenterStudentsList[i].pk_exam_std_det_id,
        examId: this.examCenterStudentsList[i].fk_exam_id,
        studentId: this.examCenterStudentsList[i].fk_student_id,
        hallticketNo: this.examCenterStudentsList[i].hallticket_number,
        isPresent: this.examCenterStudentsList[i].is_present,
        isufm: this.examCenterStudentsList[i].isufm,
        attendanceTakenEmpId: +localStorage.getItem('employeeId'),
        attendanceTakenDate: moment().format('YYYY-MM-DD'),
        isActive: true
      })
    }
    this.spinner.show();
    this.crudService.update1(this.examStudentDetailsUrl, this.examCenterStudentsList1)
      .subscribe(result => {
        this.spinner.hide();
        if (result.success === true) {
          if (result.statusCode === 200) {
            this.snotifyService.success(result.message, 'Success!');
            this.getStudentsList();
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
