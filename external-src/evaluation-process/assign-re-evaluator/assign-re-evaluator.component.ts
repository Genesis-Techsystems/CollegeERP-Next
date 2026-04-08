import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { ExamMaster } from 'app/main/models/examMaster';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import * as _ from 'lodash';

@Component({
  selector: 'app-assign-re-evaluator',
  templateUrl: './assign-re-evaluator.component.html',
  styleUrls: ['./assign-re-evaluator.component.scss']
})
export class AssignReEvaluatorComponent implements OnInit {

  displayedColumns: string[] = ['id', 'OmrSerialNo', 'validatorEvaluatorName', 'marks'];
  displayedColumnsList: string[] = ['id', 'OmrSerialNo', 'validatorEvaluatorName', 'Actions'];
  dataSourceData: MatTableDataSource<any>;
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('uploadXl') uploadXl: ElementRef;

  private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
  private addMultipleExamEvaluationAssignmentsUrl = CONSTANTS.addMultipleExamEvaluationAssignmentsUrl;
  private getExamEvaluationSubjectCodes = CONSTANTS.getExamEvaluationCodesUrl;
  private evaluatorassignmentUrl = CONSTANTS.evaluatorassignmentUrl;

  evaluatorForm: FormGroup;
  evaluatorListForm: FormGroup;
  examTimetableList: any[] = []
  examEvaluationList1 = []
  selectedSubjects = []
  step = 0;
  flag: boolean
  examSubjects: any;
  monthYear = [];
  courseCode: any;
  courseyearcode: any;
  subjectcode: any;
  getevaluatorList: any;
  ListExamSubjects: any;
  monthYear1 = [];
  collegeCode = [];
  evaluatorName = [];
  configuredData = [];
  NotconfiguredData = [];
  pk_examevaluator_profiledet_id: any;
  assignEvaluator = [];
  courseyearcode1 = [];
  subjectcode1 = [];
  searchExams = [];
  examEvaluationList: any[];
  Barcode: any;
  data: any;
  duplicateCourseGroups: any = [];
  examDetails: ExamMaster;
  examAnswerPapaerList: any = [];
  PaperCount: any;
  check = false;
  evaluationListData = [];
  profileIds: any;
  StudentEvaluationAssignment = [];
  UnAssinged = 0;
  totalStudents = 0;
  divisionCount = 0;
  checksubject = false;
  profile: '';
  EvaluationStudents = 0;
  runButton: boolean = false;
  examEvaluationListLength = 0;
  NoOfAssigned = 0;
  NoOfAnswerpapersUploaded: any;
  monthYearDuplicateList = [];
  AssignedList: any[];
  AssignedListData: any[];
  SelectedList = [];
  selectedList: boolean;
  Evaluators = [];
  evlautorListData = [];
  count: number;
  Evaluators1 = [];
  details: string;
  subjectDetailsList = [];
  subjectFilterData = [];
  postData: any[];
  subjectflag: boolean;
  subjectCode: any;
  coursecode: string;
  courseYearcode: string;
  MainEvaluators: any[];
  courseYrCode: string;
  subcode: string;
  examList: any[];
  examDataList = [];
  examDuplicateList = [];
  courseName: any;
  courseYearName: any;
  subjectName: any;
  examName: any;
  filtersDetailsList = [];
  academicYearsList = [];
  academicYears = [];
  courseYearDetails = [];
  regulationsList = [];
  regulations = [];
  subjectListDetails = [];
  subjectId;

  examDate = this.genericFunctions.momentWithDateFormatYMD(this.genericFunctions.moment());

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private genericFunctions: GenericFunctions) {
  }


  ngOnInit(): void {
    this.evaluatorForm = this.formBuilder.group({
      courseId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      examId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      regulationId: ['', Validators.required],
      subjectId: ['', Validators.required],
      isReevaluation: [false]
    })
    this.evaluatorListForm = this.formBuilder.group({
      evaluatorId: [''],
      listevaluatorId: [],
    });
    this.getFiltersData();
    this.dataSource = new MatTableDataSource<any>(this.examEvaluationList);
    setTimeout(() => {
      this.dataSource.paginator = this.paginator;
    }),
      this.dataSource.sort = this.sort;
  }
  getFiltersData(): void {
    this.flag = false;
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_filters' },
      { paramName: 'in_flag_type', paramValue: 'REGSUP' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_univ_examcenter_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_sub_flag_type', paramValue: '' },
      { paramName: 'in_param1', paramValue: 0 },
      { paramName: 'in_param2', paramValue: 0 },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
    ];
    this.crudService.getDetailsByRequest(this.examFiltersByCodeUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (const list of this.filtersDetailsList) {
              if (list?.length > 0 && list[0].flag === 'univ_exam_filters') {
                this.examSubjects = list;
                break;
              }
            }
            /*----------- COURSE -----------*/
            if (this.examSubjects && this.examSubjects.length > 0) {
              const courseCodeData = this.examSubjects.map(({ fk_course_id }) => fk_course_id);
              this.courseCode = this.examSubjects.filter(({ fk_course_id }, index) =>
                !courseCodeData.includes(fk_course_id, index + 1));
            }
            if (this.courseCode && this.courseCode.length > 0) {
              this.evaluatorForm.get('courseId').setValue(this.courseCode[0].fk_course_id);
              this.selectedCourse(this.evaluatorForm.value.courseId);
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
  selectedCourse(courseId) {
    this.flag = false;
    this.academicYearsList = [];
    this.academicYears = [];
    this.examList = [];
    this.examDataList = []
    this.examDuplicateList = []
    this.courseYearDetails = [];
    this.courseyearcode1 = [];
    this.courseyearcode = [];
    this.regulationsList = [];
    this.regulations = [];
    this.subjectListDetails = [];
    this.evaluatorListForm.get('evaluatorId').setValue('')
    this.evaluatorListForm.get('listevaluatorId').setValue('')
    this.examEvaluationList = []
    this.AssignedList = []
    this.evaluationListData = []
    this.StudentEvaluationAssignment = []
    this.AssignedListData = []
    this.filtersDetailsList = []
    this.SelectedList = []
    this.Evaluators = []
    this.MainEvaluators = []
    this.evlautorListData = []
    this.Evaluators1 = []
    this.dataSourceData = new MatTableDataSource([]);
    this.runButton = true;
    this.checksubject = false;
    this.selectedList = false
    this.SelectedList = []
    this.flag = false
    this.AssignedListData = []
    this.postData = []
    this.subjectflag = true
    this.subjectDetailsList = []
    this.subjectFilterData = []
    this.evaluatorForm.get('academicYearId').setValue('')
    this.evaluatorForm.get('examId').setValue('')
    this.evaluatorForm.get('courseYearId').setValue('')
    this.evaluatorForm.get('regulationId').setValue('')
    this.evaluatorForm.get('subjectId').setValue('')
    /*----------- ACADEMIC YEARS -----------*/
    if (courseId != null && courseId !== undefined) {
      this.academicYearsList = this.examSubjects.filter(x => (x.fk_course_id === this.evaluatorForm.value.courseId))
      if (this.academicYearsList.length > 0) {
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (this.academicYears.length > 0) {
        this.academicYears = this.academicYears.sort((a, b) => parseInt(b.academic_year) - parseInt(a.academic_year))
        this.evaluatorForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
        this.selectedAcademicYear(this.evaluatorForm.value.academicYearId)
      }
    }
  }
  selectedAcademicYear(academicYearId) {
    this.flag = false;
    this.examList = [];
    this.examDataList = [];
    this.examDuplicateList = [];
    this.courseYearDetails = [];
    this.courseyearcode1 = [];
    this.courseyearcode = [];
    this.regulationsList = [];
    this.regulations = [];
    this.subjectListDetails = [];
    this.evaluatorListForm.get('evaluatorId').setValue('')
    this.evaluatorListForm.get('listevaluatorId').setValue('')
    this.examEvaluationList = []
    this.AssignedList = []
    this.evaluationListData = []
    this.StudentEvaluationAssignment = []
    this.AssignedListData = []
    this.filtersDetailsList = []
    this.SelectedList = []
    this.Evaluators = []
    this.MainEvaluators = []
    this.evlautorListData = []
    this.Evaluators1 = []
    this.dataSourceData = new MatTableDataSource([]);
    this.runButton = true;
    this.checksubject = false;
    this.selectedList = false
    this.SelectedList = []
    this.flag = false
    this.AssignedListData = []
    this.postData = []
    this.subjectflag = true
    this.subjectDetailsList = []
    this.subjectFilterData = []
    this.evaluatorForm.get('examId').setValue('')
    this.evaluatorForm.get('courseYearId').setValue('')
    this.evaluatorForm.get('regulationId').setValue('')
    this.evaluatorForm.get('subjectId').setValue('')
    this.evaluatorForm.get('regulationId').setValue('');
    /*----------- Exams List -----------*/
    if (academicYearId !== null && academicYearId !== undefined) {
      this.examDataList = this.examSubjects.filter(x => (x.fk_course_id === this.evaluatorForm.value.courseId && x.fk_academic_year_id === this.evaluatorForm.value.academicYearId))
      if (this.examDataList.length > 0) {
        const examsLists = this.examDataList.map(({ fk_exam_id }) => fk_exam_id);
        this.examList = this.examDataList.filter(({ fk_exam_id }, index) =>
          !examsLists.includes(fk_exam_id, index + 1));
        this.examDuplicateList = this.examList;
      }
      if (this.examDuplicateList && this.examDuplicateList.length > 0) {
        this.evaluatorForm.get('examId').setValue(this.examList[0].fk_exam_id)
        this.selectedExam(this.evaluatorForm.value.examId)
      }
    }
  }
  searchExam(value) {
    this.examDuplicateList = []
    this.searchExamdata(value);
  }
  searchExamdata(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examList.length; i++) {
      let option = this.examList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
        this.examDuplicateList.push(option);
      }
    }
  }
  selectedExam(examId) {
    this.flag = false;
    this.courseYearDetails = [];
    this.courseyearcode1 = [];
    this.courseyearcode = [];
    this.regulationsList = [];
    this.regulations = [];
    this.subjectListDetails = [];
    this.evaluatorListForm.get('evaluatorId').setValue('')
    this.evaluatorListForm.get('listevaluatorId').setValue('')
    this.examEvaluationList = []
    this.AssignedList = []
    this.evaluationListData = []
    this.StudentEvaluationAssignment = []
    this.AssignedListData = []
    this.filtersDetailsList = []
    this.SelectedList = []
    this.Evaluators = []
    this.MainEvaluators = []
    this.evlautorListData = []
    this.Evaluators1 = []
    this.dataSourceData = new MatTableDataSource([]);
    this.runButton = true;
    this.checksubject = false;
    this.selectedList = false
    this.SelectedList = []
    this.flag = false
    this.AssignedListData = []
    this.postData = []
    this.subjectflag = true
    this.subjectDetailsList = []
    this.subjectFilterData = []
    this.evaluatorForm.get('courseYearId').setValue('')
    this.evaluatorForm.get('regulationId').setValue('')
    this.evaluatorForm.get('subjectId').setValue('')
    if (examId != null && examId !== undefined) {
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_regexamstd' },
        { paramName: 'in_flag_type', paramValue: 'REGSUP' },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_univ_examcenter_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: 0 },
        { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: 0 },
        { paramName: 'in_course_year_id', paramValue: 0 },
        { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
        { paramName: 'in_regulation_id', paramValue: 0 },
        { paramName: 'in_subject_id', paramValue: 0 },
        { paramName: 'in_sub_flag_type', paramValue: '' },
        { paramName: 'in_param1', paramValue: 0 },
        { paramName: 'in_param2', paramValue: 0 },
        { paramName: 'in_loginuser_roleid', paramValue: 0 },
        { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      ];
      this.crudService.getDetailsByRequest(this.examFiltersByCodeUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.courseYearDetails = result.data.result;
              for (const list of this.courseYearDetails) {
                if (list?.length > 0 && list[0].flag === 'univ_exam_rest_filters') {
                  this.courseyearcode1 = list;
                  break;  // Stop looping once we find the first match
                }
              }
              /*----------- COURSE YEAR -----------*/
              if (this.courseyearcode1.length > 0) {
                const courseYearsList = this.courseyearcode1.map(({ fk_course_year_id }) => fk_course_year_id);
                this.courseyearcode = this.courseyearcode1.filter(({ fk_course_year_id }, index) =>
                  !courseYearsList.includes(fk_course_year_id, index + 1));
              }
              if (this.courseyearcode && this.courseyearcode.length > 0) {
                this.evaluatorForm.get('courseYearId').setValue(this.courseyearcode[0].fk_course_year_id)
                this.selectedCourseYr(this.evaluatorForm.value.courseYearId);
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
  selectedCourseYr(courseYrId) {
    this.flag = false;
    this.regulationsList = [];
    this.regulations = [];
    this.subjectListDetails = [];
    this.subjectcode1 = [];
    this.subjectcode = [];
    this.evaluatorListForm.get('evaluatorId').setValue('')
    this.evaluatorListForm.get('listevaluatorId').setValue('')
    this.examEvaluationList = []
    this.AssignedList = []
    this.evaluationListData = []
    this.StudentEvaluationAssignment = []
    this.AssignedListData = []
    this.filtersDetailsList = []
    this.SelectedList = []
    this.Evaluators = []
    this.MainEvaluators = []
    this.evlautorListData = []
    this.Evaluators1 = []
    this.dataSourceData = new MatTableDataSource([]);
    this.runButton = true;
    this.checksubject = false;
    this.selectedList = false
    this.SelectedList = []
    this.flag = false
    this.AssignedListData = []
    this.postData = []
    this.subjectflag = true
    this.subjectDetailsList = []
    this.subjectFilterData = []
    this.evaluatorForm.get('regulationId').setValue('')
    this.evaluatorForm.get('subjectId').setValue('')
    /*----------- REGULATION -----------*/
    this.regulationsList = this.courseyearcode1.filter(x => (x.fk_course_year_id === this.evaluatorForm.value.courseYearId))
    if (this.regulationsList && this.regulationsList.length > 0) {
      const regulationsList = this.regulationsList.map(({ fk_regulation_id }) => fk_regulation_id);
      this.regulations = this.regulationsList.filter(({ fk_regulation_id }, index) => !regulationsList.includes(fk_regulation_id, index + 1));
    }
    if (this.regulations && this.regulations.length > 0) {
      this.evaluatorForm.get('regulationId').setValue(this.regulations[0].fk_regulation_id);
      this.selectedRegulation(this.evaluatorForm.value.regulationId);
    }
  }
  selectedRegulation(regulationId) {
    this.subjectListDetails = [];
    this.subjectcode1 = [];
    this.subjectcode = [];
    this.evaluatorListForm.get('evaluatorId').setValue('')
    this.evaluatorListForm.get('listevaluatorId').setValue('')
    this.examEvaluationList = []
    this.AssignedList = []
    this.evaluationListData = []
    this.StudentEvaluationAssignment = []
    this.AssignedListData = []
    this.filtersDetailsList = []
    this.SelectedList = []
    this.Evaluators = []
    this.MainEvaluators = []
    this.evlautorListData = []
    this.Evaluators1 = []
    this.dataSourceData = new MatTableDataSource([]);
    this.runButton = true;
    this.checksubject = false;
    this.selectedList = false
    this.SelectedList = []
    this.flag = false
    this.AssignedListData = []
    this.postData = []
    this.subjectflag = true
    this.subjectDetailsList = []
    this.subjectFilterData = []
    this.evaluatorForm.get('subjectId').setValue('');
    if (this.evaluatorForm.value.regulationId != null && regulationId != null) {
      /*----------- SUBJECTS -----------*/
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_subject_regexamstd' },
        { paramName: 'in_flag_type', paramValue: 'REGSUP' },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_univ_examcenter_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: 0 },
        { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: 0 },
        { paramName: 'in_course_year_id', paramValue: this.evaluatorForm.value.courseYearId },
        { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
        { paramName: 'in_regulation_id', paramValue: this.evaluatorForm.value.regulationId },
        { paramName: 'in_sub_flag_type', paramValue: 'NoLAB' },
        { paramName: 'in_subject_id', paramValue: 0 },
        { paramName: 'in_param1', paramValue: 0 },
        { paramName: 'in_param2', paramValue: 0 },
        { paramName: 'in_loginuser_roleid', paramValue: 0 },
        { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      ];
      this.crudService.getDetailsByRequest(this.examFiltersByCodeUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.subjectListDetails = result.data.result;
              for (const list of this.subjectListDetails) {
                if (list?.length > 0 && list[0].flag === 'univ_exam_sub_regexamstd') {
                  this.subjectcode1 = list;
                  break;
                }
              }
              if (this.subjectcode1 && this.subjectcode1.length > 0) {
                const subjectList = this.subjectcode1.map(({ fk_subject_id }) => fk_subject_id);
                this.subjectcode = this.subjectcode1.filter(({ fk_subject_id }, index) =>
                  !subjectList.includes(fk_subject_id, index + 1));
                this.selectedSubjects = this.subjectcode;
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
  searchdata(value) {
    this.selectedSubjects = []
    this.search(value);
  }
  search(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.subjectcode.length; i++) {
      let option = this.subjectcode[i];
      if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
        this.selectedSubjects.push(option);
      }
      else if (option.subject_code.toLowerCase().indexOf(filter) >= 0) {
        this.selectedSubjects.push(option);
      }
    }
  }
  selectedsubject() {
    this.flag = false
    this.runButton = false
  }
  markItems(): void {
    this.SelectedList = []
    for (let i = 0; i < this.evlautorListData.length; i++) {
      if (this.checksubject) {
        this.evlautorListData[i].checked = true;
        this.SelectedList.push(this.evlautorListData[i]);

      } else {
        this.evlautorListData[i].checked = false;
        this.checksubject = false
        this.SelectedList = []
      }
    }

  }
  checkedItems(check, item): void {
    this.selectedList = false
    if (check == true && item.assignEvaluatorProfileId) {
      this.SelectedList.push(item)
    }
    else if (check == true && item.assignEvaluatorProfileId == undefined) {
      for (let j = 0; j < this.evlautorListData.length; j++) {
        if (this.evlautorListData[j].omr_serial_no == item.omr_serial_no) {
          this.evlautorListData[j].checked = true
          this.snotifyService.info('Please Select Evalautor', 'Info!');

        }
      }
    }

    for (let i = 0; i < this.SelectedList.length; i++) {
      if (check == false) {
        if (this.SelectedList[i].omr_serial_no == item.omr_serial_no) {
          this.SelectedList.splice(i, 1);
        }
      }
      else {
        // this.uploadedFilesData1.push(this.uploadedFilesData)
      }
    }
    console.log(this.SelectedList,'this.SelectedList')
  }
  AddList() {

    this.selectedList = true
    this.dataSourceData = new MatTableDataSource(this.SelectedList);
    this.dataSourceData.paginator = this.paginator;
    this.dataSourceData.sort = this.sort;
  }
  AssignList() {
    this.postData = [];
    console.log(this.SelectedList,'this.SelectedList');
    for (let index = 0; index < this.SelectedList.length; index++) {
      // this.pk_examevaluator_profiledet_id = this.SelectedList[index]?.examEvaluatorProfileDetId.split(',')
      // for (let k = 0; k < this.pk_examevaluator_profiledet_id.length; k++) {
      //   if (this.SelectedList[index].pk_examevaluator_profiledet_id == this.pk_examevaluator_profiledet_id[k]) {
          this.postData.push({
            collegeId: this.SelectedList[index].fk_college_id,
            // examTimetableDetId:this.SelectedList[index].Evaluatorlist[0][0].assigntimetableDelIds,
            examEvaluatorProfileDetId: this.SelectedList[index].examEvaluatorProfileDetId,
            questionPaperId: this.SelectedList[index].fk_exam_questionpaper_id,
            examEvaluatorProfileId: this.SelectedList[index].assignEvaluatorProfileId,
            // examEvaluatorId: this.SelectedList[index].assignEvaluatorId,
            examStdDetId: this.SelectedList[index].fk_exam_std_det_id,
            studentAnswerPaperId: this.SelectedList[index].fk_std_answerpaper_id,
            evaluationStatusCatDetId: 626,
            omrSerialNo: this.SelectedList[index].omr_serial_no,
            isActive: true,
            isEvaluationValidator: true,
            isRevision: this.evaluatorForm.value.isReevaluation,
            // isEvaluationValidator:
            // isRevision
            // evaluationStatusByProfileId
            // statusComments
            // evaluationTime
            // evaluatedTotalMarks
            // answerSheetCheckDate
            // evaluationStartDate
            // evaluationEndDate
            // isUfm
            // ufmReason
            // evaluatedAnswerPaper
            // evaluatedAnswerPaperPath
          })
      //   }
      // }
    }
    this.crudService.add(this.addMultipleExamEvaluationAssignmentsUrl, this.postData)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200 && result.success == true) {
          this.snotifyService.success(result.message, 'Success!');
          this.updateCount();
          this.getSubjectsMarksList();
          this.flag = false;
        } else {
          this.SelectedList
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
  Cancel(row) {
    for (let i = 0; i < this.SelectedList.length; i++) {
      if (this.SelectedList[i].omr_serial_no == row.omr_serial_no) {
        for (let j = 0; j < this.evlautorListData.length; j++) {
          if (this.evlautorListData[j].omr_serial_no == row.omr_serial_no) {
            this.evlautorListData[j].checked = false
            this.SelectedList.splice(i, 1);
          }
        }
      }
    }

    this.dataSourceData = new MatTableDataSource(this.SelectedList);
    this.dataSourceData.paginator = this.paginator;
    this.dataSourceData.sort = this.sort;
  }
  selectedEvalutor(row, event, type) {
    if (type == 'bulk') {
      this.evaluatorListForm.get('listevaluatorId').setValue(event.value)
      for (let index = 0; index < this.evlautorListData.length; index++) {
        if (event.value != 0) {
          this.evlautorListData[index].assignEvaluatorProfileId = event.value;
          this.evlautorListData[index].assignEvaluatorName = this.Evaluators.filter(x => (x.pk_exam_evaluator_profile_id == event.value))[0].evaluator_name
          this.evlautorListData[index].examEvaluatorProfileDetId = this.Evaluators.filter(x => (x.pk_exam_evaluator_profile_id == event.value))[0].pk_examevaluator_profiledet_id
          // this.evlautorListData[index].assignEvaluatorId = this.Evaluators.filter(x => (x.pk_exam_evaluator_profile_id == event.value))[0].pk_exam_evaluator_ids

        }

      }
    }
    else {
      row.assignEvaluatorProfileId = event.value
      row.assignEvaluatorName = this.Evaluators.filter(x => (x.pk_exam_evaluator_profile_id == event.value))[0]?.evaluator_name
      row.examEvaluatorProfileDetId = this.Evaluators.filter(x => (x.pk_exam_evaluator_profile_id == event.value))[0]?.pk_examevaluator_profiledet_id
      // row.assignEvaluatorId = this.Evaluators.filter(x => (x.pk_exam_evaluator_profile_id == event.value))[0]?.pk_exam_evaluator_profile_id
    }
    
  }
  applyFilter(filterValue) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  selectedFlag(){
  this.selectedList = false
    this.SelectedList = []
    this.flag = false
    this.AssignedListData = []
    this.postData = []
    this.subjectflag = true
    this.subjectDetailsList = []
    this.subjectFilterData = []
    this.evaluatorListForm.get('evaluatorId').setValue('')
    this.evaluatorListForm.get('listevaluatorId').setValue('')
    this.examEvaluationList = []
    this.AssignedList = []
    this.evaluationListData = []
    this.StudentEvaluationAssignment = []
    this.AssignedListData = []
    this.filtersDetailsList = []
    this.SelectedList = []
    this.Evaluators = []
    this.MainEvaluators = []
    this.evlautorListData = []
    this.Evaluators1 = []
    this.dataSourceData = new MatTableDataSource([]);
    this.runButton = true;
    this.checksubject = false;
    this.subjectflag = true
    this.subjectDetailsList = []
    this.subjectFilterData = []
}
  getSubjectsMarksList() {
    this.selectedList = false
    this.SelectedList = []
    this.flag = false
    this.AssignedListData = []
    this.postData = []
    this.subjectflag = true
    this.subjectDetailsList = []
    this.subjectFilterData = []
    this.evaluatorListForm.get('evaluatorId').setValue('')
    this.evaluatorListForm.get('listevaluatorId').setValue('')
    this.examEvaluationList = []
    this.AssignedList = []
    this.evaluationListData = []
    this.StudentEvaluationAssignment = []
    this.AssignedListData = []
    this.filtersDetailsList = []
    this.SelectedList = []
    this.Evaluators = []
    this.MainEvaluators = []
    this.evlautorListData = []
    this.Evaluators1 = []
    this.dataSourceData = new MatTableDataSource([]);
    this.runButton = true;
    this.checksubject = false;
    this.courseName = this.genericFunctions.getCourseCode(this.courseCode, this.evaluatorForm.value.courseId);
    if (this.evaluatorForm.value.courseYearId === 0) {
      this.courseYearName = 'All'
    } else {
      this.courseYearName = this.genericFunctions.getCourseYearCode(this.courseyearcode, this.evaluatorForm.value.courseYearId);
    }
    if (this.evaluatorForm.value.subjectCode == 0) {
      this.subjectName = 'All'
    } else {
      this.subjectName = this.genericFunctions.getSubjectCode(this.subjectcode, this.evaluatorForm.value.subjectId);

    }
    this.examName = this.genericFunctions.getExamName(this.examList, this.evaluatorForm.value.examId);
    // this.details =  this.evaluatorForm.value.courseId + ' / '  + this.evaluatorForm.value.ExamMonthYear + ' / '+ this.courseYrCode+ ' /  '  + this.subcode;
    this.subjectflag = true
    this.subjectDetailsList = []
    this.subjectFilterData = []
    let flag;
      if(this.evaluatorForm.value.isReevaluation === true){
          flag = 'get_masterlistfor_reevaluation_validator';
      }else{
          flag = 'get_masterlistfor_evaluation_validator';
      }
    let request = [
      { paramName: 'in_flag', paramValue: flag },
      { paramName: 'in_orgid', paramValue: +localStorage.getItem('organizationId') },
      { paramName: 'in_fdate', paramValue: '1990-01-01' },
      { paramName: 'in_tdate', paramValue: '1990-01-01' },
      { paramName: 'in_evalutor_profileid', paramValue: 0 },
      { paramName: 'in_exam_date', paramValue: '1990-01-01' },
      { paramName: 'in_emp_id', paramValue: 0 },
      { paramName: 'in_questionpaper_id', paramValue: 0 },
      { paramName: 'in_evaluator_role_id', paramValue: 0 },
      { paramName: 'in_academic_year', paramValue: '' },
      { paramName: 'in_exam_short_name', paramValue: '' },
      { paramName: 'in_affiliatedto_catdet_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
      { paramName: 'in_course_year_id', paramValue: this.evaluatorForm.value.courseYearId },
      { paramName: 'in_subject_id', paramValue: this.evaluatorForm.value.subjectId },
      { paramName: 'in_regulation_id', paramValue: this.evaluatorForm.value.regulationId },
      { paramName: 'in_course_id', paramValue: this.evaluatorForm.value.courseId },
      { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') }

    ];
    this.crudService.getDetailsByRequest(this.getExamEvaluationSubjectCodes, '', request, '&')
      .subscribe(result => {
        if (result.statusCode === 200) {
          this.spinner.hide()
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.subjectDetailsList = result.data.result[0];
            for (let i = 0; i < this.subjectDetailsList.length; i++) {
              // && this.subjectDetailsList[i][0].flag === 'get_masterlistfor_evaluation_validator'
              // if(this.subjectDetailsList[i].length>0){
              this.subjectFilterData = this.subjectDetailsList[i];
              // }
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
  getEvaluationList(row) {
    this.evaluatorListForm.get('evaluatorId').setValue('')
    this.evaluatorListForm.get('listevaluatorId').setValue('')
    this.spinner.show();
    this.examEvaluationList = []
    this.AssignedList = []
    this.evaluationListData = []
    this.StudentEvaluationAssignment = []
    this.AssignedListData = []
    this.filtersDetailsList = []
    this.SelectedList = []
    this.Evaluators = []
    this.MainEvaluators = []
    this.evlautorListData = []
    this.Evaluators1 = []
    this.dataSourceData = new MatTableDataSource([]);
    this.runButton = true;
    this.checksubject = false;
    this.subjectId = row.fk_subject_id;
    if (this.evaluatorForm.valid) {
    let flag;
      if(this.evaluatorForm.value.isReevaluation === true){
          flag = 'get_listfor_reevaluation_validator';
      }else{
          flag = 'get_listfor_evaluation_validator';
      }
      let request = [
        { paramName: 'in_flag', paramValue: flag },
        { paramName: 'in_orgid', paramValue: +localStorage.getItem('organizationId') },
        { paramName: 'in_fdate', paramValue: '1990-01-01' },
        { paramName: 'in_tdate', paramValue: '1990-01-01' },
        { paramName: 'in_evalutor_profileid', paramValue: 0 },
        { paramName: 'in_exam_date', paramValue: '1990-01-01' },
        { paramName: 'in_emp_id', paramValue: 0 },
        { paramName: 'in_questionpaper_id', paramValue: 0 },
        { paramName: 'in_evaluator_role_id', paramValue: 0 },
        { paramName: 'in_academic_year', paramValue: '' },
        { paramName: 'in_exam_short_name', paramValue: '' },
        { paramName: 'in_affiliatedto_catdet_id', paramValue: 0 },
        { paramName: 'in_exam_id', paramValue: row.fk_exam_id },
        { paramName: 'in_course_year_id', paramValue: row.fk_course_year_id },
        { paramName: 'in_subject_id', paramValue: row.fk_subject_id },
        { paramName: 'in_regulation_id', paramValue: row.fk_regulation_id },
        { paramName: 'in_course_id', paramValue: row.fk_course_id },
        { paramName: 'in_academic_year_id', paramValue: this.evaluatorForm.value.academicYearId },
        { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') }
      ];
      this.crudService.getDetailsByRequest(this.getExamEvaluationSubjectCodes, '', request, '&')
        .subscribe(result => {
          this.flag = true;
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.snotifyService.success(result.message, 'Success!');
              this.filtersDetailsList = result.data.result;
              for (let i = 0; i < this.filtersDetailsList.length; i++) {
                if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'evaluation_validator') {
                  this.examEvaluationList = this.filtersDetailsList[i];
                }
                else if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'evaluator_list') {
                  this.MainEvaluators = this.filtersDetailsList[i];
                }
              }
              const AssignedList = this.examEvaluationList.map(({ omr_serial_no }) => omr_serial_no);
              this.AssignedList = this.examEvaluationList.filter(({ omr_serial_no }, index) =>
                !AssignedList.includes(omr_serial_no, index + 1));

              for (let index = 0; index < this.AssignedList.length; index++) {
                if (this.AssignedList[index].is_mapped == 0) {
                  this.evlautorListData.push(this.AssignedList[index])
                }
                else {
                  this.AssignedListData.push(this.AssignedList[index])
                }
              }
              for (let i = 0; i < this.evlautorListData.length; i++) {
                this.evlautorListData[i].count = 0
                for (let j = 0; j < this.MainEvaluators.length; j++) {
                  // if (this.evlautorListData[i].fk_exam_timetable_det_id == this.MainEvaluators[j].pk_exam_timetable_det_ids) {
                    this.Evaluators.push(this.MainEvaluators[j]);
                    this.Evaluators1.push(this.MainEvaluators[j]);
                  // }
                }
              }
              const Evaluators = this.Evaluators.map(({ pk_exam_evaluator_profile_id }) => pk_exam_evaluator_profile_id);
              this.Evaluators = this.Evaluators.filter(({ pk_exam_evaluator_profile_id }, index) =>
                !Evaluators.includes(pk_exam_evaluator_profile_id, index + 1))
              const Evaluators1 = this.Evaluators1.map(({ pk_exam_evaluator_profile_id }) => pk_exam_evaluator_profile_id);
              this.Evaluators1 = this.Evaluators1.filter(({ pk_exam_evaluator_profile_id }, index) =>
                !Evaluators1.includes(pk_exam_evaluator_profile_id, index + 1))

              for (let i = 0; i < this.evlautorListData.length; i++) {
                this.evlautorListData[i].list = []
                this.evlautorListData[i].Evaluatorlist = []
                for (let j = 0; j < this.examEvaluationList.length; j++) {
                  if (this.examEvaluationList[j].omr_serial_no == this.evlautorListData[i].omr_serial_no) {
                    this.evlautorListData[i].count = this.evlautorListData[i].count + 1;
                    if (this.examEvaluationList[j].evaluator_name != this.evlautorListData[i].evaluator_name) {
                      this.evlautorListData[i].list.push({
                        Name: this.examEvaluationList[j].evaluator_name,
                        Marks: this.examEvaluationList[j].evaluated_totalmarks,
                        pk_id: this.examEvaluationList[j].fk_exam_evaluator_profile_id
                      })
                    }
                  }
                }
              }
              // for (let i = 0; i < this.evlautorListData.length; i++) {
              //   this.evlautorListData[i].Evaluatorlist=[]
              //   for (let index = 0; index < this.evlautorListData[i].list.length; index++) {
              //     for(let j = 0; j < this.Evaluators1.length; j++){
              //       if(this.Evaluators1[j].pk_exam_evaluator_profile_id!=this.evlautorListData[i].list[index].pk_id && this.Evaluators1[j].pk_exam_evaluator_profile_id!=this.evlautorListData[i].fk_exam_evaluator_profile_id){
              //         this.evlautorListData[i].Evaluatorlist.push(this.Evaluators1)
              //       }
              //       else{
              //         this.Evaluators1.splice(j, 1);
              //       }
              //     }

              //     // this.Evaluators1=this.Evaluators.filter(x=>(x.pk_exam_evaluator_profile_id!=this.evlautorListData[i].list[index].pk_id))

              //     // this.evlautorListData[i].Evaluatorlist.push(this.Evaluators1)
              //     // this.evlautorListData[i].Evaluatorlist.push(this.Evaluators)

              //   }
              // }
              for (let i = 0; i < this.evlautorListData.length; i++) {
                this.evlautorListData[i].Evaluatorlist = [];
                for (let index = 0; index < this.evlautorListData[i].list.length; index++) {
                  let validEvaluators = this.Evaluators1.filter(evaluator => {
                    return evaluator.pk_exam_evaluator_profile_id !== this.evlautorListData[i].list[index].pk_id &&
                      evaluator.pk_exam_evaluator_profile_id !== this.evlautorListData[i].fk_exam_evaluator_profile_id;
                  });
                  this.evlautorListData[i].Evaluatorlist.push(...validEvaluators);
                }
              }
              this.dataSource = new MatTableDataSource(this.AssignedListData);
              setTimeout(() => {
                this.dataSource.paginator = this.paginator;
              }),
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
    }
  }
updateCount() {
    let request = [
      { paramName: 'in_flag', paramValue: 'reevaluation_count_update' },
      { paramName: 'in_profileids', paramValue: '' },
      { paramName: 'in_exam_evaluationassignment_ids', paramValue: '', },
      { paramName: 'in_omr_serial_nos', paramValue: '', },
      { paramName: 'in_timetable_det_ids', paramValue: '' },
      { paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId },
      { paramName: 'in_subject_id', paramValue: this.subjectId },
      { paramName: 'in_course_year_id', paramValue: this.evaluatorForm.value.courseYearId }
    ];
    this.crudService.getDetailsByRequest(this.evaluatorassignmentUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          this.flag = false;
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
}
