import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-exam-center-barcodes',
  templateUrl: './exam-center-barcodes.component.html',
  styleUrls: ['./exam-center-barcodes.component.scss']
})
export class ExamCenterBarcodesComponent implements OnInit {

  private getCollegeExamCenters = CONSTANTS.getCollegeExamCenters;
  private getExamCenterDetailsUrl = CONSTANTS.getExamCenterDetailsUrl;

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
  examCenterBarcodeStudents = [];

  panelOpenState = true;
  step = 0;
  seatStep = 1;
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
  courseGroupCode: any;
  subjectCode: any;
  academicExamGroupList = [];
  courseList = [];
  courseGroupList = [];
  courseGroups = [];
  courseYearsDetails = [];
  examCourseDetails = [];
  examCenterDetailsList = [];
  params: any;
  startSeatList: any[] = [];
  endSeatList: any[] = [];

  displayedColumns: string[] = ['id', 'examcenter', 'exam', 'subject', 'student', 'examDate'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;


  constructor(private snotifyService: SnotifyService, private genericFunctions: GenericFunctions, private dialog: MatDialog,
    private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router, private formBuilder: FormBuilder,
    private route:ActivatedRoute) {
            this.getExamCenters();
  }

  ngOnInit(): void {
    this.staffForm = this.formBuilder.group({
      academicYearId: ['', Validators.required],
      examGroupId: ['', Validators.required],
      univExamcenterId: ['', Validators.required],
      courseGroupId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      subjectId: ['', Validators.required],
      startEcSeatNo: [],
      endEcSeatNo: [],
    });
    this.dataSource = new MatTableDataSource(this.examCenterStudents);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.route.queryParams
    .subscribe(params => {
    this.params = params;
    });
  }

  getExamCenters(): void {
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
                  this.academicExamGroupList = this.examCenterFilters[i];
                }else if (this.examCenterFilters[i].length > 0 && this.examCenterFilters[i][0].flag === 'ec_filter') {
                  this.examCenterDetails = this.examCenterFilters[i];
                }
              }
              const academicYearList = this.academicExamGroupList.map(({ fk_academic_year_id }) => fk_academic_year_id);
              this.academicYears = this.academicExamGroupList.filter(({ fk_academic_year_id }, index) =>
                !academicYearList.includes(fk_academic_year_id, index + 1));
            }
            if (this.academicYears.length > 0) {
              if (!this.isEmptyObject(this.params)) {
                  this.staffForm.get('academicYearId').setValue(+this.params.academicYearId);
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
      this.staffForm.get('univExamcenterId').setValue('');
      this.staffForm.get('courseYearId').setValue('');
      this.staffForm.get('subjectId').setValue('');
      this.staffForm.get('startEcSeatNo').setValue('');
      this.staffForm.get('endEcSeatNo').setValue('');
      this.examCenterDetailsList = [];
      this.examCourseDetails = [];
      this.ExamCentersColleges = [];
      this.ExamCentersCollegesList = [];
      this.filtersDetailsList = [];
      this.CollegesListDetails = [];
      this.courses = [];
      this.examsubjectStudents = [];
      this.examSubjectstd = [];
      this.examGroupList = [];
      this.examGroups = [];
      this.startSeatList = [];
      this.endSeatList = [];
      this.flag = false;
      this.examCenterBarcodeStudents = [];
      this.examCenterStudents = [];
      this.examGroupList = this.academicExamGroupList.filter(x => (x.fk_academic_year_id == this.staffForm.value.academicYearId))
        if (this.examGroupList.length > 0) {
          const examGroupList = this.examGroupList.map(({ fk_univ_exam_group_id }) => fk_univ_exam_group_id);
          this.examGroups = this.examGroupList.filter(({ fk_univ_exam_group_id }, index) => !examGroupList.includes(fk_univ_exam_group_id, index + 1));
        }
        if (this.examGroups.length > 0) {
          if (!this.isEmptyObject(this.params)) {
              this.staffForm.get('examGroupId').setValue(+this.params.examGroupId);
              this.selectedExamGroup(this.examGroups[0].fk_univ_exam_group_id)
          }else{
              this.staffForm.get('examGroupId').setValue(this.examGroups[0].fk_univ_exam_group_id);
              this.selectedExamGroup(this.examGroups[0].fk_univ_exam_group_id)
          }
        }
    }
    selectedExamGroup(examGroupId): void {
    this.staffForm.get('univExamcenterId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('subjectId').setValue('');
    this.staffForm.get('startEcSeatNo').setValue('');
    this.staffForm.get('endEcSeatNo').setValue('');
    this.examCenterDetailsList = [];
    this.examCourseDetails = [];
    this.univExamCenters = [];
    this.regulationSubjects = [];
    this.courseYearsList = [];
    this.courseYears = [];
    this.regulationFilterList = [];
    this.regulationList = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.examCenterBarcodeStudents = [];
    this.examCenterStudents = [];
    this.startSeatList = [];
    this.endSeatList = [];
    this.flag = false;
    let universityId = this.academicYears.filter(x => (x.fk_academic_year_id === this.staffForm.value.academicYearId))[0]?.fk_university_id;
    this.examCenterDetailsList = this.examCenterDetails.filter(x => (x.fk_university_id === universityId))
    const univCenters = this.examCenterDetailsList.map(({ fk_univ_ec_id }) => fk_univ_ec_id);
              this.univExamCenters = this.examCenterDetailsList.filter(({ fk_univ_ec_id }, index) =>
                !univCenters.includes(fk_univ_ec_id, index + 1));
          if (this.univExamCenters.length > 0) {
            if (!this.isEmptyObject(this.params)) {
                this.staffForm.get('univExamcenterId').setValue(+this.params.univExamcenterId);
                this.selectedExamCenter(this.staffForm.value.univExamcenterId);
            }else{
                this.staffForm.get('univExamcenterId').setValue(this.univExamCenters[0].fk_univ_ec_id);
                this.selectedExamCenter(this.staffForm.value.univExamcenterId);
            }
    }
  }
  selectedExamCenter(examCenterId){
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('subjectId').setValue('');
    this.staffForm.get('startEcSeatNo').setValue('');
    this.staffForm.get('endEcSeatNo').setValue('');
    this.courseYearsList = [];
    this.courseGroupList = [];
    this.courseGroups = [];
    this.courseYearsDetails = [];
    this.courseYears = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.examCenterBarcodeStudents = [];
    this.examCenterStudents = [];
    this.startSeatList = [];
    this.endSeatList = [];
    this.flag = false;
    let request = [
        { paramName: 'in_flag', paramValue: 'eg_cg_cy_sub_filter' },
        { paramName: 'in_flag_type', paramValue: 'REGSUP' },
        { paramName: 'in_univ_examcenter_id', paramValue: this.staffForm.value.univExamcenterId },
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
        { paramName: 'in_exam_date', paramValue: '1900-01-01' },
        { paramName: 'in_questionpaper_code', paramValue: '' },
      ];
    this.crudService.getDetailsByRequest(this.getCollegeExamCenters, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            // this.regulationSubjects = result.data.result;
            this.courseYearsList = result.data.result[0];
        if (this.courseYearsList.length > 0) {
      const courseGroupListDetails = this.courseYearsList.map(({ fk_course_group_id }) => fk_course_group_id);
      this.courseGroups = this.courseYearsList.filter(({ fk_course_group_id }, index) => !courseGroupListDetails.includes(fk_course_group_id, index + 1));
    }
    if (this.courseGroups.length > 0) {
        if (!this.isEmptyObject(this.params)) {
            this.staffForm.get('courseGroupId').setValue(+this.params.courseGroupId);
            this.selectedGroup(this.staffForm.value.courseGroupId)
        }else{
            this.staffForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
            this.selectedGroup(this.staffForm.value.courseGroupId)
        }
    }
          }
           else {
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
  selectedGroup(courseGroupId){
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('subjectId').setValue('');
    this.staffForm.get('startEcSeatNo').setValue('');
    this.staffForm.get('endEcSeatNo').setValue('');
    this.courseYearsDetails = [];
    this.courseYears = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.examCenterBarcodeStudents = [];
    this.examCenterStudents = [];
    this.startSeatList = [];
    this.endSeatList = [];
    this.flag = false;
    if(courseGroupId === 0){
       this.courseYearsDetails = this.courseYearsList
    }else{
       this.courseYearsDetails = this.courseYearsList.filter(x => (x.fk_course_group_id === this.staffForm.value.courseGroupId));
    }
      const courseYearsDetails = this.courseYearsDetails.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsDetails.filter(({ fk_course_year_id }, index) => !courseYearsDetails.includes(fk_course_year_id, index + 1));
    if (this.courseYears.length > 0) {
        if (!this.isEmptyObject(this.params)) {
            this.staffForm.get('courseYearId').setValue(+this.params.courseYearId);
            this.selectedYear(this.staffForm.value.courseYearId);
        }else{
            this.staffForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
            this.selectedYear(this.staffForm.value.courseYearId);
        }
    }
  }
    selectedYear(courseYearId) {
    this.staffForm.get('subjectId').setValue('');
    this.staffForm.get('startEcSeatNo').setValue('');
    this.staffForm.get('endEcSeatNo').setValue('');
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.examCenterBarcodeStudents = [];
    this.examCenterStudents = [];
    this.startSeatList = [];
    this.endSeatList = [];
    this.flag = false;
    if (courseYearId !== '' || courseYearId !== null) {
      // if(courseYearId === 0){
      //    this.subjectsList = this.courseYearsList.filter(x => (x.fk_course_group_id === this.staffForm.value.courseGroupId));
      // }else{
      //    this.subjectsList = this.courseYearsList.filter(x => (x.fk_course_group_id === this.staffForm.value.courseGroupId && x.fk_course_year_id === this.staffForm.value.courseYearId));
      // }
this.subjectsList = this.courseYearsList.filter(x => {
  return (this.staffForm.value.courseGroupId === 0 || x.fk_course_group_id === this.staffForm.value.courseGroupId) &&
         (this.staffForm.value.courseYearId === 0 || x.fk_course_year_id === this.staffForm.value.courseYearId);
});
      if (this.subjectsList && this.subjectsList.length > 0) {
        const courseCodeData = this.subjectsList.map(({ fk_subject_id }) => fk_subject_id);
        this.subjects = this.subjectsList.filter(({ fk_subject_id }, index) =>
          !courseCodeData.includes(fk_subject_id, index + 1));
        this.subjectsData = this.subjects;
      }
      if (this.subjects && this.subjects.length > 0) {
          if (!this.isEmptyObject(this.params)) {
              this.staffForm.get('subjectId').setValue(+this.params.subjectId);
              this.selectedSubject();
              this.getCenterStudents();
          }else{
              this.staffForm.get('subjectId').setValue(this.subjects[0]?.fk_subject_id);
              this.selectedSubject();
          }
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
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  selectedSubject(): void {
    this.staffForm.get('startEcSeatNo').setValue('');
    this.staffForm.get('endEcSeatNo').setValue('');
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.startSeatList = [];
    this.endSeatList = [];
    this.flag = false;
  }
  headerData() {
    this.staffForm.get('startEcSeatNo').setValue('');
    this.staffForm.get('endEcSeatNo').setValue('');
    this.examCenterBarcodeStudents = [];
    this.examCenterStudents = [];
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.startSeatList = [];
    this.endSeatList = [];
    this.flag = false;
    this.examCenterName = this.univExamCenters.filter(x => (x.fk_univ_ec_id == this.staffForm.value.univExamcenterId))[0]?.ec_code;
    this.examGroup = this.examGroups.filter(x => (x.fk_univ_exam_group_id === this.staffForm.value.examGroupId))[0]?.exam_group_code;
    this.courseGroupCode = this.courseGroups.filter(x => (x.fk_course_group_id === this.staffForm.value.courseGroupId))[0]?.group_code;
    this.courseYear = this.courseYears.filter(x => (x.fk_course_year_id === this.staffForm.value.courseYearId))[0]?.course_year_code;
    this.subjectCode = this.subjects.filter(x => (x.fk_subject_id == this.staffForm.value.subjectId))[0]?.subject_code;
  }
  getCenterStudents() {
    this.staffForm.get('startEcSeatNo').setValue('');
    this.staffForm.get('endEcSeatNo').setValue('');
    this.selectedCount = 0;
    this.examCenterBarcodeStudents = [];
    this.examCenterStudents = [];
    this.selectedStudents = [];
    this.startSeatList = [];
    this.endSeatList = [];
    this.headerData();
    this.selectedData();
    this.dataSource = new MatTableDataSource([]);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    if(this.staffForm.valid){
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'exam_center_students' },
      { paramName: 'in_flag_type', paramValue: 'REGSUP' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_univ_examcenter_id', paramValue: this.staffForm.value.univExamcenterId },
      { paramName: 'in_exam_group_id', paramValue: this.staffForm.value.examGroupId },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: this.staffForm.value.courseGroupId },
      { paramName: 'in_course_year_id', paramValue: this.staffForm.value.courseYearId },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: this.staffForm.value.subjectId },
      { paramName: 'in_exam_date', paramValue: '1900-01-01' },
      { paramName: 'in_questionpaper_code', paramValue: '' },
    ];
    this.crudService.getDetailsByRequest(this.getExamCenterDetailsUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.examCenterBarcodeStudents = result.data.result[0];
            this.examCenterStudents = result.data.result[0];
            this.startSeatList = [...this.examCenterStudents]
            .sort((a, b) => a.seat_no - b.seat_no);
            this.endSeatList = [...this.startSeatList];
            setTimeout(() => {
              this.dataSource = new MatTableDataSource(this.examCenterStudents);
              this.dataSource.paginator = this.paginator;
              this.dataSource.sort = this.sort;
            },100)
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
      this.snotifyService.info('Please Select Valid Filters', 'info!');
    }
  }
  onStartSeatChange() {
  this.endSeatList = [];
  const startSeat = this.staffForm.value.startEcSeatNo;

  this.endSeatList = this.examCenterStudents
    .filter(x => x.seat_no > startSeat)
    .sort((a, b) => a.seat_no - b.seat_no);
}
getStudentsBySeatNo(){
  this.examCenterStudents = [];
  const startSeatNo = Number(this.staffForm.value.startEcSeatNo);
  const endSeatNo   = Number(this.staffForm.value.endEcSeatNo);

  if (!startSeatNo || !endSeatNo) {
    return;
  }

  this.examCenterStudents = this.examCenterBarcodeStudents.filter(
    (x: any) =>
      Number(x.seat_no) >= startSeatNo &&
      Number(x.seat_no) <= endSeatNo
  );
  this.examCenterStudents = this.examCenterStudents.sort((a, b) => a.seat_no - b.seat_no);
  setTimeout(() => {
              this.dataSource = new MatTableDataSource(this.examCenterStudents);
              this.dataSource.paginator = this.paginator;
              this.dataSource.sort = this.sort;
            },100)
}
    selectedData() {
    this.dataDetails = '';
    if (this.examCenterName) {
      this.dataDetails = this.examCenterName;
    }
    if (this.examGroup) {
      this.dataDetails = this.dataDetails + ' / ' + this.examGroup;
    }
    if (this.courseYear) {
      this.dataDetails = this.dataDetails + ' / ' + this.courseYear;
    }
    if (this.courseGroupCode) {
      this.dataDetails = this.dataDetails + ' / ' + this.courseGroupCode;
    }
    if (this.subjectCode) {
      this.dataDetails = this.dataDetails + ' / ' + this.subjectCode;
    }
  }
  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  printStickers(){
        JSON.stringify(this.examCenterStudents)
        this.router.navigate(['admin-examination-management/exam-papers-delivery-process/exam-center-barcodes/print-barcodes'],
        {
            queryParams: {
            data: JSON.stringify(this.examCenterStudents),
            collegeCode: this.examCenterStudents[0]?.college_code,
            courseCode: this.examCenterStudents[0]?.course_code,
            courseGroupCode: this.examCenterStudents[0]?.group_code,
            courseYear: this.examCenterStudents[0]?.course_year_code,
            ExamName: this.examCenterStudents[0]?.exam_name,
            examId: this.staffForm.value.examId,
            printHn: true,
            barcodeNo: false,
            academicYearId: this.staffForm.value.academicYearId,
            examGroupId: this.staffForm.value.examGroupId,
            univExamcenterId: this.staffForm.value.univExamcenterId,
            courseGroupId: this.staffForm.value.courseGroupId,
            courseYearId: this.staffForm.value.courseYearId,
            subjectId: this.staffForm.value.subjectId
            }
        });
    }
    printStickersNew(){
      JSON.stringify(this.examCenterStudents)
        this.router.navigate(['admin-examination-management/exam-papers-delivery-process/exam-center-barcodes/print-barcodes-gu'],
        {
            queryParams: {
            data: JSON.stringify(this.examCenterStudents),
            collegeCode: this.examCenterStudents[0]?.college_code,
            courseCode: this.examCenterStudents[0]?.course_code,
            courseGroupCode: this.examCenterStudents[0]?.group_code,
            courseYear: this.examCenterStudents[0]?.course_year_code,
            ExamName: this.examCenterStudents[0]?.exam_name,
            examId: this.staffForm.value.examId,
            printHn: true,
            barcodeNo: false,
            academicYearId: this.staffForm.value.academicYearId,
            examGroupId: this.staffForm.value.examGroupId,
            univExamcenterId: this.staffForm.value.univExamcenterId,
            courseGroupId: this.staffForm.value.courseGroupId,
            courseYearId: this.staffForm.value.courseYearId,
            subjectId: this.staffForm.value.subjectId
            }
        });
    }
}
