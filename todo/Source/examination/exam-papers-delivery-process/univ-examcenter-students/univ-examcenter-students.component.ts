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
import { Router } from '@angular/router';
import { EditUnivExamcenterStudentsComponent } from './edit-univ-examcenter-students/edit-univ-examcenter-students.component';

@Component({
  selector: 'app-univ-examcenter-students',
  templateUrl: './univ-examcenter-students.component.html',
  styleUrls: ['./univ-examcenter-students.component.scss']
})
export class UnivExamcenterStudentsComponent implements OnInit {

  private getCollegeExamCenters = CONSTANTS.getCollegeExamCenters;
  private getExamEvaluationCodesUrl = CONSTANTS.getExamEvaluationCodesUrl;
  private UnivExamCentersUrl = CONSTANTS.UnivExamCentersUrl;
  private isActive = CONSTANTS.isActive;
  private getExamCenterStudentDetailsUrl = CONSTANTS.getExamCenterStudentDetailsUrl;
  private addListUnivEcStudentsUrl = CONSTANTS.addListUnivEcStudentsUrl;
  private UnivEcStudentsUrl = CONSTANTS.UnivEcStudentsUrl;
  private UnivEcCollegesUrl = CONSTANTS.UnivEcCollegesUrl;
  private getExamMasterDetailsUrl = CONSTANTS.getExamMasterDetailsUrl;
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
  academicExamGroupList = [];
  courseList = [];
  courseGroupList = [];
  courseGroups = [];
  courseYearsDetails = [];
  examCourseDetails = [];

  displayedColumns: string[] = ['id', 'examcenter', 'exam', 'subject', 'student', 'Actions'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;


  constructor(private snotifyService: SnotifyService, private genericFunctions: GenericFunctions, private dialog: MatDialog,
    private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router, private formBuilder: FormBuilder,) {
            this.getExamCenters();
  }

  ngOnInit(): void {
    this.staffForm = this.formBuilder.group({
      academicYearId: ['', Validators.required],
      examGroupId: ['', Validators.required],
      univExamcenterId: ['', Validators.required],
      univEcCollegeId: [''],
      courseId: [''],
      courseGroupId: [''],
      regulationId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      subjectId: ['', Validators.required],
    });
    this.dataSource = new MatTableDataSource(this.examCenterStudents);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
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
                }
              }
              const academicYearList = this.academicExamGroupList.map(({ fk_academic_year_id }) => fk_academic_year_id);
              this.academicYears = this.academicExamGroupList.filter(({ fk_academic_year_id }, index) =>
                !academicYearList.includes(fk_academic_year_id, index + 1));
            }
            if (this.academicYears.length > 0) {
              this.staffForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
              this.selectedAcademicYear(this.staffForm.value.academicYearId);
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
      this.staffForm.get('univEcCollegeId').setValue('');
      this.staffForm.get('courseId').setValue('');
      this.staffForm.get('courseYearId').setValue('');
      this.staffForm.get('regulationId').setValue('');
      this.staffForm.get('subjectId').setValue('');
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
      this.flag = false;
      this.examGroupList = this.academicExamGroupList.filter(x => (x.fk_academic_year_id == this.staffForm.value.academicYearId))
        if (this.examGroupList.length > 0) {
          const examGroupList = this.examGroupList.map(({ fk_univ_exam_group_id }) => fk_univ_exam_group_id);
          this.examGroups = this.examGroupList.filter(({ fk_univ_exam_group_id }, index) => !examGroupList.includes(fk_univ_exam_group_id, index + 1));
        }
        if (this.examGroups.length > 0) {
          this.staffForm.get('examGroupId').setValue(this.examGroups[0].fk_univ_exam_group_id);
          this.selectedExamGroup(this.examGroups[0].fk_univ_exam_group_id)
        }
    }
    selectedExamGroup(examGroupId): void {
    this.staffForm.get('univExamcenterId').setValue('');
    this.staffForm.get('univEcCollegeId').setValue('');
    this.staffForm.get('courseId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('regulationId').setValue('');
    this.staffForm.get('subjectId').setValue('');
    this.examCourseDetails = [];
    this.examCenterDetails = [];
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
    this.flag = false;
    this.spinner.show();
    let request = [
        { paramName: 'in_flag', paramValue: 'eg_ec_clg_cou_filter' },
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
            this.examCenterDetails = result.data.result[0];
            this.examCourseDetails = result.data.result[1];
            const univCenters = this.examCenterDetails.map(({ fk_univ_ec_id }) => fk_univ_ec_id);
              this.univExamCenters = this.examCenterDetails.filter(({ fk_univ_ec_id }, index) =>
                !univCenters.includes(fk_univ_ec_id, index + 1));
          }
          if (this.univExamCenters.length > 0) {
      this.staffForm.get('univExamcenterId').setValue(this.univExamCenters[0].fk_univ_ec_id);
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
    selectedExamCenter(univExamcenterId) {
      this.staffForm.get('univEcCollegeId').setValue('');
      this.staffForm.get('courseYearId').setValue('');
      this.staffForm.get('regulationId').setValue('');
      this.staffForm.get('subjectId').setValue('');
      this.courseList = [];
      this.ExamCentersColleges = [];
      this.ExamCentersCollegesList = [];
      this.filtersDetailsList = [];
      this.CollegesListDetails = [];
      this.courses = [];
      this.examsubjectStudents = [];
      this.examSubjectstd = [];
      this.flag = false;
      this.ExamCentersColleges = this.examCenterDetails.filter(x => (x.fk_univ_ec_id === this.staffForm.value.univExamcenterId))
      const collegeLists = this.ExamCentersColleges.map(({ fk_college_id }) => fk_college_id);
      this.ExamCentersCollegesList = this.ExamCentersColleges.filter(({ fk_college_id }, index) =>
        !collegeLists.includes(fk_college_id, index + 1));
      if (this.ExamCentersCollegesList.length > 0) {
        this.staffForm.get('univEcCollegeId').setValue(this.ExamCentersCollegesList[0].fk_college_id);
        this.selectedExamCentersColleges(this.staffForm.value.univEcCollegeId);
      }
    }
    selectedExamCentersColleges(univEcCollegeId){
        this.staffForm.get('courseYearId').setValue('');
        this.staffForm.get('regulationId').setValue('');
        this.staffForm.get('subjectId').setValue('');
        this.courseList = [];
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
        this.examsubjectStudents = [];
        this.examSubjectstd = [];
        this.flag = false;
        let universityId = this.academicYears.filter(x => (x.fk_academic_year_id === this.staffForm.value))[0]?.fk_university_id;
        // this.courseList = this.examCourseDetails.filter(x => (x.fk_university_id === universityId))
        this.courseList = this.examCourseDetails;
        if (this.courseList.length > 0) {
          const courseList = this.courseList.map(({ fk_course_id }) => fk_course_id);
          this.courses = this.courseList.filter(({ fk_course_id }, index) => !courseList.includes(fk_course_id, index + 1));
        }
        if (this.courses.length > 0) {
          this.staffForm.get('courseId').setValue(this.courses[0].fk_course_id);
          this.selectedCourse(this.courses[0].fk_course_id)
        }
    }
  selectedCourse(examGroupId): void {
    this.staffForm.get('regulationId').setValue('');
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('subjectId').setValue('');
    this.courseGroupList = [];
    this.courseGroups = [];
    this.courseYearsDetails = [];
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
    this.flag = false;
    this.spinner.show();
    let request = [
        { paramName: 'in_flag', paramValue: 'eg_cg_cy_sub_filter' },
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
            // this.regulationSubjects = result.data.result;
            this.courseYearsList = result.data.result[0];
            this.regulationFilterList = this.courseYearsList;
    if (this.regulationFilterList.length > 0) {
      const regulationDetailList = this.regulationFilterList.map(({ fk_regulation_id }) => fk_regulation_id);
      this.regulationList = this.regulationFilterList.filter(({ fk_regulation_id }, index) => !regulationDetailList.includes(fk_regulation_id, index + 1));
    }
    if (this.regulationList.length > 0) {
      this.staffForm.get('regulationId').setValue(this.regulationList[0].fk_regulation_id);
      this.selectedRegulation(this.staffForm.value.regulationId)
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
  selectedRegulation(regulationId){
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('subjectId').setValue('');
    this.courseGroupList = [];
    this.courseGroups = [];
    this.courseYearsDetails = [];
    this.courseYears = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.flag = false;
    this.courseGroupList = this.courseYearsList.filter(x => (x.fk_regulation_id === this.staffForm.value.regulationId));
        if (this.courseGroupList.length > 0) {
      const courseGroupListDetails = this.courseGroupList.map(({ fk_course_group_id }) => fk_course_group_id);
      this.courseGroups = this.courseGroupList.filter(({ fk_course_group_id }, index) => !courseGroupListDetails.includes(fk_course_group_id, index + 1));
    }
    if (this.courseGroups.length > 0) {
      this.staffForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
      this.selectedGroup(this.staffForm.value.courseGroupId)
    }
  }
  selectedGroup(courseGroupId){
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('subjectId').setValue('');
    this.courseYearsDetails = [];
    this.courseYears = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.flag = false;
    this.courseYearsDetails = this.courseYearsList.filter(x => (x.fk_regulation_id === this.staffForm.value.regulationId && x.fk_course_group_id === this.staffForm.value.courseGroupId));
         const courseYearsDetails = this.courseYearsDetails.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsDetails.filter(({ fk_course_year_id }, index) => !courseYearsDetails.includes(fk_course_year_id, index + 1));
    if (this.courseYears.length > 0) {
      this.staffForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
      this.selectedYear(this.staffForm.value.courseYearId);
    }
  }
    selectedYear(courseYearId) {
    this.staffForm.get('subjectId').setValue('');
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.flag = false;
    if (courseYearId !== '' || courseYearId !== null) {
      this.subjectsList = this.courseYearsList.filter(x => (x.fk_regulation_id === this.staffForm.value.regulationId && x.fk_course_group_id === this.staffForm.value.courseGroupId && x.fk_course_year_id === this.staffForm.value.courseYearId));
      if (this.subjectsList && this.subjectsList.length > 0) {
        const courseCodeData = this.subjectsList.map(({ fk_subject_id }) => fk_subject_id);
        this.subjects = this.subjectsList.filter(({ fk_subject_id }, index) =>
          !courseCodeData.includes(fk_subject_id, index + 1));
        this.subjectsData = this.subjects;
      }
      if (this.subjects && this.subjects.length > 0) {
        this.staffForm.get('subjectId').setValue(this.subjects[0]?.fk_subject_id);
        this.selectedSubject();
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
  selectedSubject(): void {
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.flag = false;
  }
  headerData() {
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.flag = false;
    this.examCenterName = this.univExamCenters.filter(x => (x.fk_univ_ec_id == this.staffForm.value.univExamcenterId))[0]?.ec_code;
    this.examCenterCollege = this.ExamCentersCollegesList.filter(x => (x.fk_college_id === this.staffForm.value.univEcCollegeId))[0]?.college_code;
    this.examGroup = this.examGroups.filter(x => (x.fk_univ_exam_group_id === this.staffForm.value.examGroupId))[0]?.exam_group_code;
    this.courseYear = this.courseYears.filter(x => (x.fk_course_year_id === this.staffForm.value.courseYearId))[0]?.course_year_code;
    this.regulationCode = this.regulationList.filter(x => (x.fk_regulation_id === this.staffForm.value.regulationId))[0]?.regulation_code;
    this.subjectCode = this.subjects.filter(x => (x.fk_subject_id == this.staffForm.value.subjectId))[0]?.subject_code;
  }
  GetExamStudents() {
    if (this.staffForm.valid) {
      this.spinner.show();
      this.selectedCount = 0;
      this.examsubjectStudents = [];
      this.examSubjectstd = [];
      this.selectedStudents = [];
      this.flag = false;
      this.headerData();
      this.selectedData();
      /*----------- STUDENTS -----------*/
        // let request = [
        // { paramName: 'in_flag', paramValue: 'ec_std_list' },
        // { paramName: 'in_university_id', paramValue: +localStorage.getItem('universityId') },
        // { paramName: 'in_univ_examcenter_id', paramValue: this.staffForm.value.univExamcenterId },
        // { paramName: 'in_exam_group_id', paramValue: this.staffForm.value.examGroupId },
        // { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
        // { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
        // { paramName: 'in_exam_id', paramValue: 0 },
        // { paramName: 'in_college_id', paramValue: this.staffForm.value.univEcCollegeId },
        // { paramName: 'in_course_group_id', paramValue: this.staffForm.value.courseGroupId },
        // { paramName: 'in_course_year_id', paramValue: this.staffForm.value.courseYearId },
        // { paramName: 'in_regulation_id', paramValue: this.staffForm.value.regulationId },
        // { paramName: 'in_subject_id', paramValue: this.staffForm.value.subjectId },
        // { paramName: 'in_exam_date', paramValue: '1999-01-01'},
        // { paramName: 'in_questionpaper_code', paramValue: '' },
        // ];
        let request = [
        { paramName: 'in_flag', paramValue: 'ec_std_list' },
        { paramName: 'in_flag_type', paramValue: '' },
        { paramName: 'in_university_id', paramValue: +localStorage.getItem('universityId') },
        { paramName: 'in_univ_examcenter_id', paramValue: 27 },
        { paramName: 'in_exam_group_id', paramValue: 1 },
        { paramName: 'in_course_id', paramValue: 6 },
        { paramName: 'in_academic_year_id', paramValue: 0 },
        { paramName: 'in_exam_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: 2000136 },
        { paramName: 'in_course_group_id', paramValue: 0 },
        { paramName: 'in_course_year_id', paramValue: 0 },
        { paramName: 'in_regulation_id', paramValue: 69 },
        { paramName: 'in_subject_id', paramValue: 1012 },
        { paramName: 'in_exam_date', paramValue: '1999-01-01'},
        { paramName: 'in_questionpaper_code', paramValue: '' },
        ];
        this.crudService.getDetailsByRequest(this.getCollegeExamCenters, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.success) {
              if (result.data.result[0].length > 0) {
                this.spinner.show();
                this.examsubjectStudents = result.data.result[0].filter(x => (x.row_exists === 0));
                this.examCenterStudents = result.data.result[0].filter(x => (x.row_exists === 1));
                this.examSubjectstd = this.examsubjectStudents;
                this.flag = true;
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
    if(this.staffForm.valid){
    this.spinner.show();
    this.selectedCount = 0;
    this.examCenterStudents = [];
    this.selectedStudents = [];
    this.dataSource = new MatTableDataSource([]);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    let request = [
      { paramName: 'in_flag', paramValue: 'exam_center_students' },
      { paramName: 'in_university_id', paramValue: +localStorage.getItem('universityId') },
      { paramName: 'in_univ_examcenter_id', paramValue: this.staffForm.value.univExamcenterId },
      { paramName: 'in_exam_group_id', paramValue: this.staffForm.value.examGroupId },
      { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
      { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: this.staffForm.value.univEcCollegeId },
      { paramName: 'in_course_group_id', paramValue: this.staffForm.value.courseGroupId },
      { paramName: 'in_course_year_id', paramValue: this.staffForm.value.courseYearId },
      { paramName: 'in_regulation_id', paramValue: this.staffForm.value.regulationId },
      { paramName: 'in_subject_id', paramValue: this.staffForm.value.subjectId },
      { paramName: 'in_exam_date', paramValue: '1999-01-01'},
      { paramName: 'in_questionpaper_code', paramValue: '' },
    ];
    this.crudService.getDetailsByRequest(this.getExamCenterDetailsUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.examCenterStudents = result.data.result[0];
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
    }else{
      this.snotifyService.info('Please Select Valid Filters', 'info!');
    }
  }
    selectedData() {
    this.dataDetails = '';
    if (this.examCenterName) {
      this.dataDetails = this.examCenterName;
    }
    if (this.examCenterCollege) {
      this.dataDetails = this.dataDetails + ' / ' + this.examCenterCollege;
    }
    if (this.examGroup) {
      this.dataDetails = this.dataDetails + ' / ' + this.examGroup;
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
      let univEcCollegeDetailId = this.subjects.filter(x => (x.fk_course_year_id === this.staffForm.value.courseYearId && x.fk_regulation_id === this.staffForm.value.regulationId
        && x.fk_subject_id === this.staffForm.value.subjectId))[0]?.pk_univ_ec_college_detail_id;
      for (let i = 0; i < this.selectedStudents.length; i++) {
        details.push({
          univExamCentersId: this.staffForm.value.univExamcenterId,
          univEcCollegeDetailId: 1,
          univExamGroupId: this.staffForm.value.examGroupId,
          examMasterId: this.selectedStudents[i].pk_exam_id,
          studentDetailId: this.selectedStudents[i].fk_student_id,
          regulationId: this.staffForm.value.regulationId,
          subjectId: this.staffForm.value.subjectId,
          isActive: true,
          createdUser: +localStorage.getItem('employeeId')
        })
      }
      /*---------- ADD EXAM CENTER STUDENTS ----------*/
      this.crudService.add(this.addListUnivEcStudentsUrl, details)
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            this.GetExamStudents();
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
    const dialogRef = this.dialog.open(EditUnivExamcenterStudentsComponent, {
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
    this.spinner.show();
    this.crudService.updateDetails(this.UnivEcStudentsUrl, details, details.pk_univ_ec_student_id, 'univEcStudentId')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.success) {
            this.GetExamStudents();
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
}