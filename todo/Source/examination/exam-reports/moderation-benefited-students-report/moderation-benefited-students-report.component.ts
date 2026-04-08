import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { CONSTANTS } from 'app/main/common/constants';
import { Router, ActivatedRoute } from '@angular/router';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { GlobalService } from 'app/main/services/global.service';

@Component({
  selector: 'app-moderation-benefited-students-report',
  templateUrl: './moderation-benefited-students-report.component.html',
  styleUrls: ['./moderation-benefited-students-report.component.scss']
})
export class ModerationBenefitedStudentsReportComponent implements OnInit {

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('excelTable', { static: false }) excelTable: ElementRef;
  searchText = ''
  staffForm: FormGroup;

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private examFeeType = CONSTANTS.examFeeType;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private isActive = CONSTANTS.isActive;
  private resultprocessingUrl = CONSTANTS.ResultProcessingUrl;

  dashboard: any
  filtersDetailsList = [];
  subjectWiseresult = [];
  CollegesListDetails = [];
  colleges = [];
  examsList = [];
  searchExams = [];
  filteredExams: any;
  examData = [];
  examsLists = [];
  panelOpenState = true;
  step = 0;
  trafoItem = "Moderation Benefited Students Data";
  collegeCode: any;
  exam: any;
  dataDetails;
  courses = [];
  courseListData = [];
  courseGroups = [];
  courseYears = [];
  groupList = [];
  courseYearsList = [];
  isAdmin = false;
  courseGroup;
  courseCode;
  courseYear;
  collegeName;
  collegeLogo = [];
  orgCode = '';
  Logo: any;
  examName: any;
  academicYearsList = [];
  academicYears = [];
  collegeLists = [];
  CollegesListFilterDetails: any;
  regulationFilterList: any;
  courseGroupList: any[];
  examFeeTypesList = [];
  examFeeTypes = [];

  constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, private _globalService: GlobalService,
    private dialog: MatDialog, private genericFunctions: GenericFunctions) {
    this.dashboard = CONSTANTS.dashboard;
    this.orgCode = localStorage.getItem('orgCode');
  }

  ngOnInit(): void {
    this.staffForm = this.formBuilder.group({
      collegeId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      courseId: ['', Validators.required],
      courseGroupId: [0],
      courseYearId: [0],
      examId: ['', Validators.required],
      examTypeCatdetId: ['', Validators.required],
    });
    this.getFiltersList();
    this.isAdmin = JSON.parse(localStorage.getItem('isAdmin'));

  }
  getFiltersList(): void {
    this.filtersDetailsList = []
    this.CollegesListDetails = []
    this.colleges = []
    this.spinner.show()
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_filters' },
      { paramName: 'in_flag_type', paramValue: 'REGSUP' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
      { paramName: 'in_param1', paramValue: 0 },
      { paramName: 'in_param2', paramValue: 0 },
    ];
    this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (let i = 0; i < this.filtersDetailsList.length; i++) {
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_filters') {
                this.CollegesListFilterDetails = this.filtersDetailsList[i];
              }
            }
            const Course_Id = this.CollegesListFilterDetails.map(({ fk_course_id }) => fk_course_id);
            this.courses = this.CollegesListFilterDetails.filter(({ fk_course_id }, index) =>
              !Course_Id.includes(fk_course_id, index + 1));
            if (this.courses.length > 0) {
              this.staffForm.get('courseId').setValue(this.courses[0].fk_course_id);
              this.selectedCourse(this.staffForm.value.courseId)
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

  selectedCourse(courseId): void {
    this.staffForm.get('academicYearId').setValue('')
    this.staffForm.get('examId').setValue('');
    this.staffForm.get('collegeId').setValue('');
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('examTypeCatdetId').setValue('');
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
    this.academicYears = []
    this.examsList = [];
    this.filtersDetailsList = []
    this.colleges = []
    this.courseGroups = []
    this.courseYearsList = []
    this.courseYears = []
    this.academicYearsList = []
    this.subjectWiseresult = [];
    if (courseId != null) {
      this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId));
      if (this.academicYearsList.length > 0) {
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (this.academicYears.length > 0) {
        this.staffForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
        this.selectedAcademicYear(this.staffForm.value.academicYearId)
      }
    }
  }

  selectedAcademicYear(academicYearId): void {
    this.staffForm.get('examId').setValue('');
    this.staffForm.get('collegeId').setValue('');
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('examTypeCatdetId').setValue('');
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
    this.examsList = [];
    this.filtersDetailsList = []
    this.colleges = []
    this.courseGroups = []
    this.courseYearsList = []
    this.courseYears = []
    this.examsLists = []
    this.examData = []
    this.subjectWiseresult = [];
    if (academicYearId) {
      this.examsLists = this.CollegesListFilterDetails.filter(x => (x.fk_course_id === this.staffForm.value.courseId && x.fk_academic_year_id == this.staffForm.value.academicYearId))
      if (this.examsLists.length > 0) {
        const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
        this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
        this.examData = this.examsList;
      }
      if (this.examsList.length > 0) {
        this.staffForm.get('examId').setValue(this.examsList[0].fk_exam_id);
        this.selectedExam(this.staffForm.value.examId);
      }
    }
  }

  selectedExam(examId): void {
    this.staffForm.get('collegeId').setValue('');
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('examTypeCatdetId').setValue('');
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
    this.filtersDetailsList = []
    this.colleges = []
    this.courseGroups = []
    this.courseYearsList = []
    this.courseYears = []
    this.subjectWiseresult = [];
    if (examId != null && examId !== undefined) {
    this.getExamTypes(this.staffForm.value.examId);
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_regexamstd' },
      { paramName: 'in_flag_type', paramValue: 'ALL' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
      { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
      { paramName: 'in_param1', paramValue: 0 },
      { paramName: 'in_param2', paramValue: 0 },
    ];
    this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (let i = 0; i < this.filtersDetailsList.length; i++) {
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_rest_filters') {
                this.CollegesListDetails = this.filtersDetailsList[i];
              }
              else if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'regulations') {
                this.regulationFilterList = this.filtersDetailsList[i];
              }
            }

            if (this.CollegesListDetails) {
              /*----------- Colleges -----------*/
              this.colleges = []
              this.courseGroups = []
              this.courseYearsList = []
              this.courseYears = []
              this.colleges = this.CollegesListDetails
              const CollegeIdData = this.colleges.map(({ fk_college_id }) => fk_college_id);
              this.colleges = this.colleges.filter(({ fk_college_id }, index) => !CollegeIdData.includes(fk_college_id, index + 1));
              if (this.colleges.length > 0) {
                this.staffForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                this.selectedCollege(this.staffForm.value.collegeId);
              }
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
getExamTypes(examId) {
    this.staffForm.get('examTypeCatdetId').setValue('');
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
    this.subjectWiseresult = [];
    if (examId != null && examId !== undefined) {
      this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examFeeType, 'true', this.generalDetailsByCodeUrl, this.isActive)
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.data.resultList && result.data.resultList !== '') {
              this.examFeeTypesList = result.data.resultList;
              if (this.examFeeTypesList && this.examFeeTypesList.length > 0) {
                for (let i = 0; i < this.examFeeTypesList.length; i++) {
                  if (this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_regular_exam) {
                    if (this.examFeeTypesList[i].generalDetailCode === 'Regular') {
                      this.examFeeTypes.push(this.examFeeTypesList[i]);
                    }
                  }
                  if (this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_supply_exam) {
                    if (this.examFeeTypesList[i].generalDetailCode === 'Supple') {
                      this.examFeeTypes.push(this.examFeeTypesList[i]);
                    }
                  }
                  if (this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_internal_exam) {
                    if (this.examFeeTypesList[i].generalDetailCode === 'Internal') {
                      this.examFeeTypes.push(this.examFeeTypesList[i]);
                    }
                  }
                }
              }
              if (this.examFeeTypes && this.examFeeTypes.length > 0) {
                this.staffForm.get('examTypeCatdetId').setValue(this.examFeeTypes[0]?.generalDetailId);
                this.selectedExamType(this.staffForm.value.examTypeCatdetId);
              }
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
  selectedExamType(examTypeCatdetId) {
    this.subjectWiseresult = [];
  }
  selectedCollege(collegeId): void {
    this.collegeCode = this.colleges.filter(x => (x.fk_college_id === collegeId))[0].college_code;
    this.courseGroups = []
    this.courseYearsList = []
    this.courseYears = []
    this.subjectWiseresult = [];
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    if (collegeId != null) {
      this.courseGroupList = []
      this.courseGroups = []
      this.courseGroupList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.staffForm.value.collegeId))
      if (this.courseGroupList.length > 0) {
        const courseGroups = this.courseGroupList.map(({ fk_course_group_id }) => fk_course_group_id);
        this.courseGroups = this.courseGroupList.filter(({ fk_course_group_id }, index) => !courseGroups.includes(fk_course_group_id, index + 1));
      }
      if (this.courseGroups.length > 0) {
        this.staffForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
        this.selectedGroup(this.staffForm.value.courseGroupId)
      }
    }
  }

  selectedGroup(courseGroupId): void {
    this.staffForm.get('courseYearId').setValue('');
    this.courseYearsList = []
    this.courseYears = []
    this.subjectWiseresult = [];
    if (courseGroupId === 0) {
      this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.staffForm.value.collegeId));
    } else {
      this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.staffForm.value.collegeId && x.fk_course_group_id == courseGroupId));
    }
    /*----------- COURSES Years -----------*/
    if (this.courseYearsList.length > 0) {
      const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
      this.courseYears = this.courseYears.sort((a, b) => a.cy_sort_order - b.cy_sort_order);
    }
    if (this.courseYears.length > 0) {
      this.staffForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
    }
  }

  searchexam(value) {
    this.examData = [];
    this.search(value)
  }

  search(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examsList.length; i++) {
      let option = this.examsList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
        this.examData.push(option);
      }
    }
  }

  reset(): void {
    this.staffForm.get('collegeId').setValue('');
    this.staffForm.get('courseId').setValue('');
    this.staffForm.get('examId').setValue('');
    this.staffForm.get('courseGroupId').setValue(0);
    this.staffForm.get('courseYearId').setValue(0);
    this.subjectWiseresult = [];
  }
  selectedData() {
    if (this.collegeCode) {
      this.dataDetails = this.collegeCode;
    }
    if (this.courseCode) {
      this.dataDetails = this.dataDetails + ' / ' + this.courseCode;
    }
    if (this.courseGroup) {
      this.dataDetails = this.dataDetails + ' / ' + this.courseGroup;
    }
    if (this.courseYear) {
      this.dataDetails = this.dataDetails + ' / ' + this.courseYear;
    }
    if (this.exam) {
      this.dataDetails = this.dataDetails + ' / ' + this.exam;
    }
  }
  getColleges(): void {
    this.collegeLogo = [];
    this.Logo = [];
    /*----------- COLLEGES -----------*/
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', 'isActive')
      .subscribe(result => {
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.collegeLogo = result.data.resultList;
            this.Logo = this.collegeLogo.filter(x => (x.collegeId == this.staffForm.value.collegeId))[0].logo
            this.collegeName = this.collegeLogo.filter(x => (x.collegeId == this.staffForm.value.collegeId))[0].collegeName
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
  getDetails() {
    this.subjectWiseresult = [];
    if (this.staffForm.valid) {
      this.spinner.show();
      this.collegeCode = this.colleges.filter(x => (x.fk_college_id == this.staffForm.value.collegeId))[0]?.college_code;
      this.courseCode = this.courses.filter(x => (x.fk_course_id == this.staffForm.value.courseId))[0]?.course_code;
      // this.exam = this.examsList.filter(x => x.fk_exam_id == this.staffForm.value.examId)[0]?.exam_name;
      this.courseGroup = this.courseGroups.filter(x => (x.fk_course_group_id == this.staffForm.value.courseGroupId))[0]?.group_code;
      this.courseYear = this.courseYears.filter(x => (x.fk_course_year_id == this.staffForm.value.courseYearId))[0]?.course_year_name;
      this.getColleges();
      let request = [
        { paramName: 'in_flag', paramValue: 'mod_benefited_std_by_subject' },
        { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
        { paramName: 'in_examtype', paramValue: this.staffForm.value.examTypeCatdetId },
        { paramName: 'in_college_id', paramValue: this.staffForm.value.collegeId },
        { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: this.staffForm.value.courseGroupId },
        { paramName: 'in_course_year_id', paramValue: this.staffForm.value.courseYearId },
      ];
      this.crudService.getDetailsByRequest(this.resultprocessingUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              if (result?.data?.result?.[0]?.length > 0) {
                this.exam = result.data.result[0][0]?.exam_label_name;
                this.selectedData();
                const groupedByGroup: { [groupId: string]: any } = {};

                for (const item of result.data.result[0]) {
                  const groupId = item.group_id;
                  const subjectId = item.subjectId;

                  if (!groupedByGroup[groupId]) {
                    groupedByGroup[groupId] = {
                      group_id: groupId,
                      group_code: item.group_code,
                      subjects: {}
                    };
                  }

                  if (!groupedByGroup[groupId].subjects[subjectId]) {
                    groupedByGroup[groupId].subjects[subjectId] = {
                      subjectId: subjectId,
                      subject_name: item.subject_name || item.subject,
                      students: []
                    };
                  }

                  groupedByGroup[groupId].subjects[subjectId].students.push(item);
                }

                this.subjectWiseresult = Object.values(groupedByGroup).map((g: any) => ({
                  ...g,
                  subjects: Object.values(g.subjects)
                }));
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
  Print() {
    window.print();
  }
  exportAsExcel() {
    const uri = 'data:application/vnd.ms-excel;base64,';
    const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>`;
    const base64 = function (s) { return window.btoa(unescape(encodeURIComponent(s))) };
    const format = function (s, c) { return s.replace(/{(\w+)}/g, function (m, p) { return c[p]; }) };

    const table = this.excelTable.nativeElement;
    const ctx = { worksheet: 'Worksheet', table: table.innerHTML };

    const link = document.createElement('a');
    link.download = `${this.trafoItem}.xls`;
    link.href = uri + base64(format(template, ctx));
    link.click();
  }
}
