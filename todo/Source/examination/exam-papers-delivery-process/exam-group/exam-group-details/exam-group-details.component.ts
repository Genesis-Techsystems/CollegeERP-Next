import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { ParametersService } from 'app/main/services/parameters.service';

@Component({
  selector: 'app-exam-group-details',
  templateUrl: './exam-group-details.component.html',
  styleUrls: ['./exam-group-details.component.scss']
})
export class ExamGroupDetailsComponent implements OnInit {

  addevaluatorform: FormGroup;

  step = 0;

  filtersData = [];
  colleges = [];
  examFilter = [];
  examsList = [];
  examData = [];
  exams = [];
  subjects = [];
  subjectsList = [];
  subjectsData = [];
  selectedExamId = '';
  selectedRoleId = '';
  selectedSubjects = [];
  selectedData = [];
  examGroupDetails = [];
  dialogTitle = 'Add Exam Group Details';
  date = new Date();

  private getExamGroupFilterUrl = CONSTANTS.getExamGroupFilterUrl;
  private UnivExamGroupDetailsUrl = CONSTANTS.UnivExamGroupDetailsUrl;
  private saveUnivExamGroupDetailsUrl = CONSTANTS.saveUnivExamGroupDetailsUrl;
  private isActive = CONSTANTS.isActive;

  displayedColumns: string[] = ['exam', 'actions'];

  dataSource: MatTableDataSource<any>;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  roles = [];
  filtersDetailsList = [];
  examListDetails = [];
  courses = [];
  academicYears = [];
  academicYearsList = [];
  regulationDetails = [];
  regulationList = [];
  regulations = [];
  subjectListDetails = [];
  data: any;

  displayFilters: boolean = false;
  collegesListDetails = [];
  groupList = [];
  courseGroups = [];
  courseYearsList = [];
  courseYears = [];
  examLabBatches = [];

  constructor(public parameterService: ParametersService,
    private genericFunctions: GenericFunctions, private formBuilder: FormBuilder,
    private snotifyService: SnotifyService, private spinner: NgxSpinnerService, private cd: ChangeDetectorRef,
    private crudService: CrudService, public router: Router) {
  }

  ngOnInit(): void {
    this.addevaluatorform = this.formBuilder.group({
      academicYearId: ['', Validators.required],
      examId: []
    });
    this.dataSource = new MatTableDataSource([]);
    this.dataSource.sort = this.sort;
    if (this.parameterService.examGroupDetails) {
      this.data = this.parameterService.examGroupDetails;
      this.date = this.data.examMonthYr;
      /*----------- EVALUATORPROFILEDETAILS -----------*/
      this.crudService.listDetailsByTwoIds(this.UnivExamGroupDetailsUrl, this.data.univExamGroupId, 'true', 'univExamGroup.univExamGroupId', this.isActive)
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
                this.examGroupDetails = result.data.resultList;
                  if (this.examGroupDetails &&
                    this.examGroupDetails.length > 0) {
                    this.dialogTitle = 'Edit Exam Group Details';
                    this.selectedData = this.examGroupDetails;
                    this.dataSource = new MatTableDataSource(this.selectedData);
                    this.dataSource.sort = this.sort;
                  }
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
    } else {
      this.goBack();
    }
    this.getExamFiltersList();
  }
  getExamFiltersList(): void {
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_group_list' },
      { paramName: 'in_flag_type', paramValue: 'REGSUP' },
      { paramName: 'in_university_id', paramValue: this.data.universityId},
      { paramName: 'in_exam_group_id', paramValue: this.data.univExamGroupId},
      { paramName: 'in_univ_examcenter_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: this.data.academicYearId },
      { paramName: 'in_exam_month_yr', paramValue: this.data.examMonthYr },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_sub_flag_type', paramValue: '' },
      { paramName: 'in_param1', paramValue: 0 },
      { paramName: 'in_param2', paramValue: 0 },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
    ];
    this.crudService.getDetailsByRequest(this.getExamGroupFilterUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (const list of this.filtersDetailsList) {
              if (list?.length > 0 && list[0].flag === 'univ_exam_group_list') {
                this.examListDetails = list;
                break;
              }
            }
            this.academicYearsList = this.examListDetails;
            if (this.academicYearsList.length > 0) {
            const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
            this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
            }
            if (this.academicYears.length > 0) {
              this.academicYears = this.academicYears.sort((a, b) => parseInt(b.academic_year) - parseInt(a.academic_year))
            if(this.data.academicYearId !== null){
              this.addevaluatorform.get('academicYearId').setValue(this.data.academicYearId);
            }
            this.selectedAcademicYear(this.addevaluatorform.value.academicYearId)
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
  selectedAcademicYear(academicYearId): void {
    this.addevaluatorform.get('examId').setValue('');
    this.examFilter = [];
    this.exams = [];
    this.examData = [];
    if (academicYearId !== null && academicYearId !== undefined) {
      /*----------- Exams List -----------*/
      this.examFilter = this.examListDetails.filter(x => (x.fk_academic_year_id === this.addevaluatorform.value.academicYearId))
      if (this.examFilter && this.examFilter.length > 0) {
        const examsLists = this.examFilter.map(({ fk_exam_id }) => fk_exam_id);
        this.exams = this.examFilter.filter(({ fk_exam_id }, index) =>
          !examsLists.includes(fk_exam_id, index + 1));
        this.examData = this.exams;
      }
    }
  }
  searchexam(value) {
    this.examData = [];
    this.filterExams(value)
  }
  filterExams(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examsList.length; i++) {
      let option = this.examsList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
        this.examData.push(option);
      }
    }
  }
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  addToTable() {
  const formValues = this.addevaluatorform.value;

  if (formValues.examId && formValues.examId.length > 0) {

    const uniqueExamIds = [...new Set(formValues.examId)];

    uniqueExamIds.forEach((examId: number) => {

      const id = Number(examId);
      const examName = this.getExamNameById(id);

      // ✅ STRICT duplicate check (UI level)
      const existsInUI = this.selectedData.some(x => Number(x.examId) === id);

      if (!existsInUI) {

        const profileDetail = {
          univExamGroupId: this.data.univExamGroupId,
          examId: id,
          examName: examName,
          isActive: true,
          reason: formValues.reason,
          createdUser: +localStorage.getItem('employeeId')
        };

        this.examGroupDetails.push(profileDetail);
        this.selectedData.push(profileDetail);

      } else {
        console.log('Duplicate blocked:', id);
      }

    });

    this.dataSource = new MatTableDataSource(this.selectedData);
    this.dataSource.sort = this.sort;

    this.addevaluatorform.get('examId').setValue([]);

  } else {
    this.snotifyService.info('Please select at least one Exam', 'Info!');
  }
}
  // Helper function to get exam name by examId
  getExamNameById(examId: any) {
    const exam = this.examData.find(e => e.fk_exam_id === examId);
    return exam ? exam.exam_name : '';
  }
  deleteRow(examId: any) {
    const id = +examId;
    if (this.dialogTitle === 'Add Exam Group Details') {
      const index = this.selectedData.findIndex((item) => item.examId === id);
      if (index > -1) {
        this.examGroupDetails.splice(index, 1);
        this.selectedData.splice(index, 1);
        this.dataSource = new MatTableDataSource(this.selectedData);
        this.dataSource.sort = this.sort;
      }
    } else {

  // Update API data
  this.examGroupDetails = this.examGroupDetails.map(item =>
    item.examId === id ? { ...item, isActive: false } : item
  );

  // Update UI
  this.selectedData = this.selectedData.filter(item => item.examId !== id);

  // Refresh table
  this.dataSource = new MatTableDataSource(this.selectedData);
  this.dataSource.sort = this.sort;
    }
  }
  submit() {
    this.data.examGroupDetails = this.examGroupDetails;
    this.spinner.show();
    this.crudService.add(this.saveUnivExamGroupDetailsUrl, this.examGroupDetails)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.getDetails();
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
  getDetails(){
    this.examGroupDetails = [];
    this.selectedData = [];
    this.selectedData = this.examGroupDetails;
    this.dataSource = new MatTableDataSource(this.selectedData);
    this.dataSource.sort = this.sort;
    /*----------- EVALUATORPROFILEDETAILS -----------*/
      this.crudService.listDetailsByTwoIds(this.UnivExamGroupDetailsUrl, this.data.univExamGroupId, 'true', 'univExamGroup.univExamGroupId', this.isActive)
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
                this.examGroupDetails = result.data.resultList;
                  if (this.examGroupDetails &&
                    this.examGroupDetails.length > 0) {
                    this.dialogTitle = 'Edit Exam Group Details';
                    this.selectedData = this.examGroupDetails;
                    this.dataSource = new MatTableDataSource(this.selectedData);
                    this.dataSource.sort = this.sort;
                  }
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
  goBack() {
    this.router.navigate(['admin-examination-management/exam-papers-delivery-process/exam-group']);
  }
}
