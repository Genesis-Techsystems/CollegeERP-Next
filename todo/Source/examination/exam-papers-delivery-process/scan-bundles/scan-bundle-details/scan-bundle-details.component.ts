import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { Router } from '@angular/router';
import { ScanBundleDetailsModalComponent } from './scan-bundle-details-modal/scan-bundle-details-modal.component';
import { ParametersService } from 'app/main/services/parameters.service';
import { MatRadioChange } from '@angular/material/radio';
import { ReplaySubject } from 'rxjs';

@Component({
  selector: 'app-scan-bundle-details',
  templateUrl: './scan-bundle-details.component.html',
  styleUrls: ['./scan-bundle-details.component.scss']
})
export class ScanBundleDetailsComponent implements OnInit {

  private getCollegeExamCenters = CONSTANTS.getCollegeExamCenters;
  private getDetailsByCourseYearIdUrl = CONSTANTS.getDetailsByCourseYearIdUrl;
  private getDetailsByRegulationIdUrl = CONSTANTS.getDetailsByRegulationIdUrl;
  private getSubjectByIdUrl = CONSTANTS.getSubjectByIdUrl;
  private UnivExamScanbundleUrl = CONSTANTS.UnivExamScanbundleUrl;
  private getExamCenterStudentDetailsUrl = CONSTANTS.getExamCenterStudentDetailsUrl;
  private UnivExamScanbundleDetailsUrl = CONSTANTS.UnivExamScanbundleDetailsUrl;
  private getExamMasterDetailsUrl = CONSTANTS.getExamMasterDetailsUrl;
  private getScanBundleDetailsUrl = CONSTANTS.getScanBundleDetailsUrl;
  private saveUnivExamScanbundleDetailsUrl = CONSTANTS.saveUnivExamScanbundleDetailsUrl;
  private searchExamOmrSerialNoUrl = CONSTANTS.searchExamOmrSerialNoUrl;

  filtersDetailsList = [];
  CollegesListDetails = [];
  courses = [];
  academicYears = [];
  searchExams = [];
  examsList = [];
  academicYearsList = [];
  examData = [];
  examsLists = [];
  univExamCenters = [];
  examCenterColleges = [];
  examsubjectStudents = [];
  subjectsList = [];
  subjects = [];
  subjectsData = [];
  examSubjectstd = [];
  examCenterStudents = [];

  panelOpenState = true;
  step = 0;
  staffForm: FormGroup;
  flag = false;
  checksubject: boolean;
  selectedCount: number;
  selectedStudents: any[];
  courseYearsList = [];
  courseYears = [];
  regulationFilterList = [];
  regulationList = [];
  examCenterFilters = [];
  examCenterDetails = [];
  ExamCentersColleges = [];
  ExamCentersCollegesList = [];
  regulationSubjects = [];
  regulationDetailsList = [];
  examGroupList = [];
  examGroups = [];
  dataDetails = '';
  examCenterName: any;
  examCenterCollege: any;
  examGroup: any;
  courseYear: any;
  regulationCode: any;
  subjectCode: any;
  subjectName: any;
  bundleName: any;
  scanBundlesList = [];
  filtersSetArray = [];
  check = 1;
  searchOmr = [];
  searchOmrList = [];
  selectedOmrDetails = [];
  examCourseFiltersList = [];
  courseYearsDetails = [];
  regulations = [];

  displayedColumns: string[] = ['id', 'omrSerialNo', 'student', 'subject', 'Actions'];
  scannedDisplayedColoumns: string[] = ['id', 'bagName', 'omrSerialNo', 'stdFirstName','subjectName', 'actions'];
  dataSource: MatTableDataSource<any>;

  DuplicatedataSource: MatTableDataSource<any>
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  public filteredOmrs: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  @ViewChild('barcode') barcode: ElementRef;
  myControl1 = new FormControl();
  @ViewChild('barcode', { static: false }) barcodeInput!: ElementRef;

  constructor(private snotifyService: SnotifyService, private genericFunctions: GenericFunctions, private dialog: MatDialog,
    private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router, private formBuilder: FormBuilder,
    private parameterService: ParametersService) {

  }

  ngOnInit(): void {
    this.staffForm = this.formBuilder.group({
      academicYearId: ['', Validators.required],
      examGroupId: ['', Validators.required],
      courseId: ['', Validators.required],
      univExamcenterId: [''],
      courseYearId: ['', Validators.required],
      regulationId: ['', Validators.required],
      subjectId: ['', Validators.required],
      examId: [''],
      univExamScanbundleId: ['', Validators.required],
    });
    this.dataSource = new MatTableDataSource(this.examCenterStudents);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    if(this.parameterService.examScanBundleDetails && this.parameterService.examScanBundleDetails.length > 0){
       this.filtersSetArray = this.parameterService.examScanBundleDetails;
    }
       this.getExamGroupDetails();
  }

clear($event: MatRadioChange){
        if ($event.value === 2) {
            this.check = 2;
            this.selectedCount = 0;
            this.examsubjectStudents = [];
            this.examSubjectstd = [];
            this.selectedStudents = [];
            this.flag = false;
            this.examCenterStudents = [];
            this.dataSource = new MatTableDataSource([]);
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
        }
        else{
            this.check = 1;
            this.selectedCount = 0;
            this.examsubjectStudents = [];
            this.examSubjectstd = [];
            this.selectedStudents = [];
            this.flag = false;
            this.examCenterStudents = [];
            this.dataSource = new MatTableDataSource([]);
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
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
              this.staffForm.get('academicYearId').setValue(this.filtersSetArray[0].academicYearId);
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
  this.selectedCount = 0;
  this.examsubjectStudents = [];
  this.examSubjectstd = [];
  this.selectedStudents = [];
  this.flag = false;
  this.examCenterStudents = [];
  this.dataSource = new MatTableDataSource([]);
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
  this.selectedOmrDetails = [];
  this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
  this.DuplicatedataSource.paginator = this.paginator;
  this.DuplicatedataSource.sort = this.sort;
  this.examGroupList = this.examCenterDetails.filter(x => (x.fk_academic_year_id == this.staffForm.value.academicYearId))
  if (this.examGroupList.length > 0) {
    const examGroupList = this.examGroupList.map(({ fk_univ_exam_group_id }) => fk_univ_exam_group_id);
    this.examGroups = this.examGroupList.filter(({ fk_univ_exam_group_id }, index) => !examGroupList.includes(fk_univ_exam_group_id, index + 1));
  }
  if (this.examGroups.length > 0) {
    if(this.filtersSetArray && this.filtersSetArray.length > 0){
              this.staffForm.get('examGroupId').setValue(this.filtersSetArray[0].examGroupId);
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
  this.selectedStudents = [];
  this.flag = false;
  this.examCenterStudents = [];
  this.dataSource = new MatTableDataSource([]);
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
  this.selectedOmrDetails = [];
  this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
  this.DuplicatedataSource.paginator = this.paginator;
  this.DuplicatedataSource.sort = this.sort;
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
              this.staffForm.get('courseId').setValue(this.filtersSetArray[0].courseId);
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
    this.selectedStudents = [];
    this.flag = false;
    this.examCenterStudents = [];
    this.dataSource = new MatTableDataSource([]);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.selectedOmrDetails = [];
    this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
    this.DuplicatedataSource.paginator = this.paginator;
    this.DuplicatedataSource.sort = this.sort;
    this.courseYearsDetails = this.examCourseFiltersList.filter(x => (x.fk_course_id === this.staffForm.value.courseId));
         const courseYearsDetails = this.courseYearsDetails.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsDetails.filter(({ fk_course_year_id }, index) => !courseYearsDetails.includes(fk_course_year_id, index + 1));
    if (this.courseYears.length > 0) {
      if(this.filtersSetArray && this.filtersSetArray.length > 0){
         this.staffForm.get('courseYearId').setValue(this.filtersSetArray[0].courseYearId);
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
  this.selectedStudents = [];
  this.flag = false;
  this.examCenterStudents = [];
  this.dataSource = new MatTableDataSource([]);
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
  this.selectedOmrDetails = [];
  this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
  this.DuplicatedataSource.paginator = this.paginator;
  this.DuplicatedataSource.sort = this.sort;
  this.regulationList = this.examCourseFiltersList.filter(x => (x.fk_course_id === this.staffForm.value.courseId && x.fk_course_year_id === this.staffForm.value.courseYearId));
  const regulationDetails = this.regulationList.map(({ fk_regulation_id }) => fk_regulation_id);
      this.regulations = this.regulationList.filter(({ fk_regulation_id }, index) => !regulationDetails.includes(fk_regulation_id, index + 1));
    if (this.regulations.length > 0) {
      if(this.filtersSetArray && this.filtersSetArray.length > 0){
              this.staffForm.get('regulationId').setValue(this.filtersSetArray[0].regulationId);
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
      this.selectedStudents = [];
      this.flag = false;
      this.examCenterStudents = [];
      this.dataSource = new MatTableDataSource([]);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
      this.selectedOmrDetails = [];
      this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
      this.DuplicatedataSource.paginator = this.paginator;
      this.DuplicatedataSource.sort = this.sort;
      this.subjectsList = this.examCourseFiltersList.filter(x => (x.fk_course_id === this.staffForm.value.courseId && x.fk_course_year_id === this.staffForm.value.courseYearId && x.fk_regulation_id === this.staffForm.value.regulationId));
      if (this.subjectsList && this.subjectsList.length > 0) {
        const courseCodeData = this.subjectsList.map(({ fk_subject_id }) => fk_subject_id);
        this.subjects = this.subjectsList.filter(({ fk_subject_id }, index) =>
          !courseCodeData.includes(fk_subject_id, index + 1));
        this.subjectsData = this.subjects;
      }
      if (this.subjects && this.subjects.length > 0) {
        if(this.filtersSetArray && this.filtersSetArray.length > 0){
           this.staffForm.get('subjectId').setValue(this.filtersSetArray[0]?.subjectId);
           this.selectedSubject(this.staffForm.value.subjectId);
        }else{
           this.staffForm.get('subjectId').setValue(this.subjects[0]?.fk_subject_id);
           this.selectedSubject(this.staffForm.value.subjectId);
        }
      }
}
  searchdata(value) {
    this.subjectsData = []
    this.search(value);
  }
  search(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.subjects.length; i++) {
      let option = this.subjects[i];
      if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
        this.subjectsData.push(option);
      }
      else if (option.subject_code.toLowerCase().indexOf(filter) >= 0) {
        this.subjectsData.push(option);
      }
    }
  }
  selectedSubject(subjectId): void {
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.scanBundlesList = [];
    this.flag = false;
    this.selectedOmrDetails = [];
    this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
    this.DuplicatedataSource.paginator = this.paginator;
    this.DuplicatedataSource.sort = this.sort;
      this.spinner.show();
      this.crudService.listDetailsByFiveIds(this.UnivExamScanbundleUrl, this.staffForm.value.examGroupId, this.staffForm.value.courseYearId,
        this.staffForm.value.regulationId, this.staffForm.value.subjectId, 'true',
        'univExamGroup.univExamGroupId', this.getDetailsByCourseYearIdUrl, this.getDetailsByRegulationIdUrl, this.getSubjectByIdUrl, 'isActive')
      .subscribe(result => {
         this.spinner.hide();
         if (result.statusCode === 200){
              if (result.data.resultList && result.data.resultList !== '') {
                  this.scanBundlesList = result.data.resultList;
                  if(this.scanBundlesList && this.scanBundlesList.length > 0){
                     if(this.filtersSetArray && this.filtersSetArray.length > 0){
                        this.staffForm.get('univExamScanbundleId').setValue(this.filtersSetArray[0]?.univExamScanbundleId);
                        this.getCenterStudents();
                     }else{
                        this.staffForm.get('univExamScanbundleId').setValue(this.scanBundlesList[0]?.univExamScanbundleId);
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
  selectedScanBundle(univExamScanbundleId){
  this.selectedCount = 0;
  this.examsubjectStudents = [];
  this.examSubjectstd = [];
  this.flag = false;
  this.selectedOmrDetails = [];
  this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
  this.DuplicatedataSource.paginator = this.paginator;
  this.DuplicatedataSource.sort = this.sort;
  this.examCenterStudents = [];
  this.selectedStudents = [];
  this.dataSource = new MatTableDataSource([]);
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
  }
  headerData() {
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.selectedOmrDetails = [];
    this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
    this.DuplicatedataSource.paginator = this.paginator;
    this.DuplicatedataSource.sort = this.sort;
    this.examGroup = this.examGroups.filter(x => (x.fk_univ_exam_group_id === this.staffForm.value.examGroupId))[0]?.exam_group_code;
    this.courseYear = this.courseYears.filter(x => (x.fk_course_year_id === this.staffForm.value.courseYearId))[0]?.course_year_code;
    this.regulationCode = this.regulations.filter(x => (x.fk_regulation_id === this.staffForm.value.regulationId))[0]?.regulation_code;
    this.subjectCode = this.subjects.filter(x => (x.fk_subject_id === this.staffForm.value.subjectId))[0]?.subject_code;
    this.bundleName = this.scanBundlesList.filter(x => (x.univExamScanbundleId === this.staffForm.value.univExamScanbundleId))[0]?.bundleNumber;
  }
  GetExamStudents() {
    this.selectedCount = 0;
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.selectedStudents = [];
    this.flag = false;
    this.selectedOmrDetails = [];
    this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
    this.DuplicatedataSource.paginator = this.paginator;
    this.DuplicatedataSource.sort = this.sort;
    if (this.staffForm.valid) {
      this.spinner.show();
      this.headerData();
      this.selectedData();
      this.getCenterStudents();
      /*----------- STUDENTS -----------*/
      // tslint:disable-next-line:max-line-length
      this.crudService.listByTenIds(this.getExamCenterStudentDetailsUrl, 'exam_center_OMR_details',
        this.staffForm.value.examGroupId,
        0,
        0,
        0,
        0,
        this.staffForm.value.courseYearId,
        0,
        this.staffForm.value.regulationId,
        this.staffForm.value.subjectId,
        'in_flag', 'in_exam_group_id', 'in_exam_id', 'in_college_id', 'in_course_id', 'in_course_group_id', 'in_course_year_id', 'in_std_id',
        'in_regulation_id', 'in_subject_id')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.success) {
              if (result.data.result[0].length > 0) {
                this.spinner.show();
                this.examsubjectStudents = result.data.result[0];
                if (this.examsubjectStudents && this.examsubjectStudents.length > 0) {
                  this.examsubjectStudents = this.examsubjectStudents.filter(
                    x => !this.examCenterStudents.some(y => y.studentDetailId === x.fk_exam_std_det_id)
                  );
                }
                this.examSubjectstd = this.examsubjectStudents;
                this.spinner.hide();
              } else {
                this.snotifyService.success('No Records Found.', 'Success!');
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
  }
  getCenterStudents() {
    this.selectedCount = 0;
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.flag = false;
    this.selectedOmrDetails = [];
    this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
    this.DuplicatedataSource.paginator = this.paginator;
    this.DuplicatedataSource.sort = this.sort;
    this.headerData();
    this.selectedData();
    this.examCenterStudents = [];
    this.selectedStudents = [];
    this.dataSource = new MatTableDataSource([]);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    if(this.staffForm.valid){
    this.spinner.show();
    let request = [
        { paramName: 'in_flag', paramValue: 'ec_scan_bundle_std_list' },
        { paramName: 'in_flag_type', paramValue: '' },
        { paramName: 'in_univ_examcenter_id', paramValue: 0 },
        { paramName: 'in_exam_group_id', paramValue: this.staffForm.value.examGroupId },
        { paramName: 'in_college_id', paramValue: 0 },
        { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: 0 },
        { paramName: 'in_course_year_id', paramValue: this.staffForm.value.courseYearId },
        { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
        { paramName: 'in_exam_id', paramValue: 0 },
        { paramName: 'in_regulation_id', paramValue: this.staffForm.value.regulationId },
        { paramName: 'in_subject_id', paramValue: this.staffForm.value.subjectId },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_exam_date', paramValue: '1900-01-01' },
        { paramName: 'in_questionpaper_code', paramValue: '' },
      ];
    this.crudService.getDetailsByRequest(this.getCollegeExamCenters, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.examsubjectStudents = result.data.result[0].filter(x => (x.row_exists === 0));
            this.examCenterStudents = result.data.result[0].filter(x => (x.row_exists === 1));
            this.examSubjectstd = this.examsubjectStudents;
            this.dataSource = new MatTableDataSource(this.examCenterStudents);
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
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
      this.flag = true;
    }else{
      this.snotifyService.info('Please Select Valid Filters', 'info!');
    }
  }
  selectedData() {
    this.dataDetails = '';
    if (this.examGroup) {
      this.dataDetails = this.examGroup;
    }
    if (this.courseYear) {
      this.dataDetails = this.dataDetails + ' / ' + this.courseYear;
    }
    if (this.regulationCode) {
      this.dataDetails = this.dataDetails + ' / ' + this.regulationCode;
    }
    if (this.subjectCode) {
      this.dataDetails = this.dataDetails + ' / ' + this.subjectCode;
    }
    if (this.bundleName) {
      this.dataDetails = this.dataDetails + ' / ' + this.bundleName;
    }
  }
  checkedserialNo(check, item) {
    item.isSelected = check;
    this.selectedCount = 0;
    this.selectedStudents = [];
    for (let i = 0; i < this.examsubjectStudents.length; i++) {
      if (this.examsubjectStudents[i].isSelected) {
        this.selectedStudents.push(this.examsubjectStudents[i]);
        this.selectedCount++;
      }
    }
  }
  markItems(): void {
    this.selectedCount = 0;
    this.selectedStudents = [];
    for (let i = 0; i < this.examsubjectStudents.length; i++) {
      if (this.checksubject) {
        this.examsubjectStudents[i].checked = true;
        this.examsubjectStudents[i].isSelected = true;
        this.selectedStudents.push(this.examsubjectStudents[i]);
        this.selectedCount++;
      } else {
        this.examsubjectStudents[i].checked = false;
        this.examsubjectStudents[i].isSelected = false;
        this.checksubject = false
        this.selectedStudents = []
        // this.examsubjectStudents=[]
      }
    }
  }
  searchOmrNo(value) {
    this.examsubjectStudents = []
    this.searchOmrNos(value);
  }
  searchOmrNos(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examSubjectstd.length; i++) {
      let option = this.examSubjectstd[i];
      if (option.omr_serial_no.toLowerCase().indexOf(filter) >= 0) {
        this.examsubjectStudents.push(option);
      }

    }
  }
  Assign() {
    if (this.selectedStudents && this.selectedStudents.length > 0) {
      let details = [];
      this.spinner.show();
      for (let i = 0; i < this.selectedStudents.length; i++) {
        details.push({
          univExamScanbundleId: this.staffForm.value.univExamScanbundleId,
      examStdDetId: this.selectedStudents[i].fk_exam_std_det_id,
      omrSerialNo: this.selectedStudents[i].omr_serial_no,
      isActive: true,
          createdUser: +localStorage.getItem('employeeId')
        })
      }
      /*---------- ADD EXAM CENTER STUDENTS ----------*/
      this.crudService.add(this.saveUnivExamScanbundleDetailsUrl, details)
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            this.getCenterStudents();
            this.snotifyService.success(result.message, 'Success!');
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
    } else {
      this.snotifyService.info('Please Select Students...!', 'Info!');
    }
  }
  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  editDialog(row) {
    const dialogRef = this.dialog.open(ScanBundleDetailsModalComponent, {
      width: '800px',
      data: row
    });
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
        this.updateDetails(details)
      }
    });
  }
  updateDetails(details) {
    let payload = {
    univExamScanbundleDetId : details.pk_univ_exam_scan_bundle_detail_id,
    isActive : details.isActive,
    reason : details.reason,
    omrSerialNo : details.omr_serial_no,
    examStdDetId : details.fk_exam_std_det_id
    }
    this.spinner.show();
    this.crudService.updateDetails(this.UnivExamScanbundleDetailsUrl, payload, details.pk_univ_exam_scan_bundle_detail_id, 'univExamScanbundleDetId')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.success) {
            this.getCenterStudents();
            this.snotifyService.success(result.message, 'Success!');
          } else {
            this.snotifyService.info(result.message, 'Info!');
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
  goBack(){
    const row = [{
          academicYearId : this.staffForm.value.academicYearId,
          examGroupId : this.staffForm.value.examGroupId,
          courseId : this.staffForm.value.courseId,
          courseYearId : this.staffForm.value.courseYearId,
          regulationId : this.staffForm.value.regulationId,
          subjectId : this.staffForm.value.subjectId,
    }]
    this.parameterService.examScanBundlesFiltersData = row;
    this.router.navigate(['admin-examination-management/exam-papers-delivery-process/scan-bundles']);
  }
  enteredOmr(event): void {
    this.searchOmr = [];
    this.searchOmrList = []
    this.filteredOmrs.next(this.searchOmr.slice());
    if (event.target.value.length > 2) {
      /*----------- Books Search -----------*/
      this.crudService.listByIds(this.searchExamOmrSerialNoUrl, event.target.value, 'query')
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
              this.searchOmr = result.data;
              this.filteredOmrs.next(this.searchOmr.slice());
              this.searchOmrList = this.searchOmr.filter(x => (x.omrSerialNo == event.target.value))
              if (this.searchOmrList.length > 0) {
                this.filteredOmrs.next([].slice());
                this.filteredOmrs.next(this.searchOmrList.slice());
                for (let i = 0; i < this.searchOmrList.length; i++) {
                  this.selectedOmrDetails.push({
                    univExamScanbundleId: this.staffForm.value.univExamScanbundleId,
                    omrSerialNo: this.searchOmrList[i].omrSerialNo,
                    examStdDetId:this.searchOmrList[i].examStdDetId,
                    hallticketNumber:this.searchOmrList[i].hallticketNumber
                  });
                }
              }
             this.selectedOmrDetails = this.selectedOmrDetails.filter((item, index, self) =>
                index === self.findIndex((t) => (
                  t.omrSerialNo === item.omrSerialNo
                ))
              );
              this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
              this.DuplicatedataSource.paginator = this.paginator;
              this.DuplicatedataSource.sort = this.sort;
              this.barcode.nativeElement.value =''
              this.myControl1.setValue('');
              console.log(this.selectedOmrDetails,"selectedOmrDetails");
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
    onKey(event: any) {
    this.searchOmr = [];
    this.filteredOmrs.next(this.searchOmr.slice());
  }
  getOmrScan(){
    this.flag = true;
    this.selectedOmrDetails = [];
    this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
    this.DuplicatedataSource.paginator = this.paginator;
    this.DuplicatedataSource.sort = this.sort;
    this.headerData();
    this.selectedData();
    this.getCenterStudents();
    this.focusInput();
  }
  focusInput() {
    setTimeout(() => {
      this.barcodeInput.nativeElement.focus();
    }, 0);
  }
    deleteOmr(item, index): void {
    if (index > - 1) {
      this.selectedOmrDetails.splice(index, 1);
    }
    this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
    this.DuplicatedataSource.sort = this.sort;
    console.log(this.selectedOmrDetails,"this.selectedOmrDetails");
  }
  AssignScanBundles(){
    if (this.selectedOmrDetails && this.selectedOmrDetails.length > 0) {
      let details = [];
      this.spinner.show();
      for (let i = 0; i < this.selectedOmrDetails.length; i++) {
        details.push({
          univExamScanbundleId: this.staffForm.value.univExamScanbundleId,
          examStdDetId: this.selectedOmrDetails[i].examStdDetId,
          omrSerialNo: this.selectedOmrDetails[i].omrSerialNo,
          isActive: true,
          createdUser: +localStorage.getItem('employeeId')
        })
      }
      /*---------- ADD EXAM CENTER STUDENTS ----------*/
      this.crudService.add(this.saveUnivExamScanbundleDetailsUrl, details)
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            this.getCenterStudents();
            this.selectedOmrDetails = [];
            this.DuplicatedataSource = new MatTableDataSource(this.selectedOmrDetails);
            this.DuplicatedataSource.paginator = this.paginator;
            this.DuplicatedataSource.sort = this.sort;
            this.snotifyService.success(result.message, 'Success!');
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
    } else {
      this.snotifyService.info('No Answer Papers Scanned...!', 'Info!');
    }
  }
}