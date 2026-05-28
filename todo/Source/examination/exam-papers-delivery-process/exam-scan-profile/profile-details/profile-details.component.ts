import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
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
  selector: 'app-profile-details',
  templateUrl: './profile-details.component.html',
  styleUrls: ['./profile-details.component.scss']
})
export class ProfileDetailsComponent implements OnInit {

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
  isEditMode: boolean = false;
  editIndex: number = -1;
  selectedExamId = '';
  selectedRoleId = '';
  selectedSubjects = [];
  selectedData = [];
  examEvaluatorProfileDetailsDTOS = [];
  dialogTitle = 'Add Scan Profile Details';

  private updateExamEvaluatorProfiles = CONSTANTS.updateExamEvaluatorProfiles;

  private profileDetailUrl = CONSTANTS.profileDetailUrl;
  private getViewDataUrl = CONSTANTS.getViewDataUrl;
  private popProfileEmployeesUrl = CONSTANTS.popProfileEmployeesUrl;
  private examCommittesUrl = CONSTANTS.examCommittesUrl;
  private getExamEvaluatorProfileDetailsUrl = CONSTANTS.getExamEvaluatorProfileDetailsUrl;
  private ExamScanProfileUrl = CONSTANTS.ExamScanProfileUrl;
  private ExamScanProfileDetailsUrl = CONSTANTS.ExamScanProfileDetailsUrl;
  private ExamScanProfileDetails = CONSTANTS.ExamScanProfileDetails;
  private examLabBatchesCrudUrl = CONSTANTS.examLabBatchesCrudUrl;
  private getPoPScanProfileEmployeesUrl = CONSTANTS.getPoPScanProfileEmployeesUrl;

  displayedColumns: string[] = ['examGroup', 'role','status', 'actions'];
  displayedColumns2: string[] = ['examGroup', 'role','status', 'actions'];

  dataSource: MatTableDataSource<any>;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  roles = [];
  filtersDetailsList = [];
  examListDetails = [];
  courses = [];
  academicYears = [];
  currentEditId: number;
  academicYearsList = [];
  regulationDetails = [];
  regulationList = [];
  regulations = [];
  subjectListDetails = [];
  data: any;
  examGroups: any[] = [];
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
      courseId: [''],
      academicYearId: [''],
      examId: [''],
      regulationId: [''],   // ✅ ADD
      subjectId: [''],
      roleId: ['', Validators.required],
      examGroupId: [''],
      collegeId: [''],
      courseGroupId: [''],
      courseYearId: [''],
      examLabBatchesId: [''],
      isReEvaluation: [],
      maxNoOfEvaluationsAssign: [],
      maxNoOfReevaluationsAssign: [],
      reason: [''],
      isActive: [true]
    });
    this.dataSource = new MatTableDataSource([]);
    this.dataSource.sort = this.sort;
    this.addevaluatorform.get('isActive').setValue(true);
    if (this.parameterService.evaluatorSubjectrole) {
      this.data = this.parameterService.evaluatorSubjectrole;
      /*----------- EVALUATORPROFILEDETAILS -----------*/
      this.loadEvaluatorDetails()
    }
    else {
      this.goBack();
    }
    this.getExamRoles();
    this.getExamFiltersList();
  }
  getExamRoles() {

    let request = [
      { paramName: 'in_viewname', paramValue: 'v_get_exam_eval_roles' },
      { paramName: 'in_select', paramValue: '' },
      { paramName: 'in_whereclause', paramValue:encodeURIComponent("and upper(role_name) like '%SCAN%'") },
    ];
    this.crudService.getDetailsByRequest(this.getViewDataUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.roles = result.data.result[0];
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

  editRow(row: any, index: number) {
    this.isEditMode = true;
    this.editIndex = index;

    this.currentEditId = row.examScanProfileDetailId; // 

    this.addevaluatorform.patchValue({
      examGroupId: row.univExamGroupId || row.examGroupId,
      roleId: row.roleId || row.evaluatorRoleId,
      isActive: row.isActive ?? true // 
    });
  }

  loadEvaluatorDetails() {
    this.crudService.getDetailsByIdWithSortOrder(
      'ExamScanProfileDetails',
      this.data.examScanProfileId,
      'examScanProfile.examScanProfileId',
    ).subscribe(result => {

      if (result.statusCode === 200) {
        this.examEvaluatorProfileDetailsDTOS = result.data?.resultList || [];

        if (this.examEvaluatorProfileDetailsDTOS.length > 0) {

          this.dialogTitle = 'Edit Scan Profile Details';

          this.displayFilters = this.examEvaluatorProfileDetailsDTOS.some(
            item =>
              item.evaluatorRoleId === 64 ||
              item.evaluatorRoleId === 70 ||
              item.evaluatorRoleId === 96 ||
              item.evaluatorRoleId === 97 ||
              item.evaluatorRoleId === 116
          );

          this.selectedData = this.examEvaluatorProfileDetailsDTOS;
          this.dataSource = new MatTableDataSource(this.selectedData);
          this.dataSource.sort = this.sort;
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
  getExamFiltersList(): void {
    this.spinner.show();
    let f = this.addevaluatorform.value;

    let request = [
      { paramName: 'in_flag', paramValue: 'college_center_exam_group_filters' },
      { paramName: 'in_flag_type', paramValue: '' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_univ_examcenter_id', paramValue: 0 }, 
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 }, 
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_exam_group_id', paramValue:  0 },
      { paramName: 'in_course_year_id', paramValue:  0 },
      { paramName: 'in_academic_year_id', paramValue:  0 },
      { paramName: 'in_regulation_id', paramValue:  0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_exam_date', paramValue: '1900-01-01' },
      { paramName: 'in_questionpaper_code', paramValue: '' },
    ];
    this.crudService.getDetailsByRequest(this.profileDetailUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            this.examListDetails = this.filtersDetailsList[0] || [];
            if (this.examListDetails && this.examListDetails.length > 0) {
              const uniqueGroupsMap = new Map();

                  this.examListDetails.forEach(item => {
                    if (!uniqueGroupsMap.has(item.fk_univ_exam_group_id)) {
                      uniqueGroupsMap.set(item.fk_univ_exam_group_id, item);
                    }
                  });

                  this.examGroups = Array.from(uniqueGroupsMap.values());
              const courseList = this.examListDetails.map(({ fk_course_id }) => fk_course_id);
              this.courses = this.examListDetails.filter(({ fk_course_id }, index) =>
                !courseList.includes(fk_course_id, index + 1));
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

  searchdata(value) {
    this.subjectsData = [];
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
  selectedRole(roleId) {
    this.addevaluatorform.get('collegeId').setValue('');
    this.addevaluatorform.get('courseGroupId').setValue('');
    this.addevaluatorform.get('courseYearId').setValue('');
    this.addevaluatorform.get('examLabBatchesId').setValue('');
    this.collegesListDetails = [];
    this.colleges = [];
    this.groupList = [];
    this.courseGroups = [];
    this.courseYearsList = [];
    this.courseYears = [];
    this.examLabBatches = [];
    this.displayFilters = false;
    if (roleId === 64 || roleId === 70 || roleId === 96 || roleId === 97 || roleId === 116) {
      this.displayFilters = true;
      if (this.regulationList && this.regulationList.length > 0) {
        this.collegesListDetails = this.regulationList.filter(r => (r.fk_regulation_id === this.addevaluatorform.value.regulationId))
        const CollegeIdData = this.collegesListDetails.map(({ fk_college_id }) => fk_college_id);
        this.colleges = this.collegesListDetails.filter(({ fk_college_id }, index) =>
          !CollegeIdData.includes(fk_college_id, index + 1));
      }
    }
  }



  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  addToTable() {
    const formValues = this.addevaluatorform.value;

    if (!formValues.examGroupId || !formValues.roleId) {
      this.snotifyService.info('Please select exam group and role.', 'Info!');
      return;
    }

    const selectedGroup = this.examGroups.find(
      g => g.fk_univ_exam_group_id === formValues.examGroupId
    );

    const selectedRole = this.roles.find(
      r => r.pk_role_id === formValues.roleId
    );

    const newData = {
      examScanProfileDetailId: this.isEditMode
        ? this.selectedData[this.editIndex]?.examScanProfileDetailId
        : null, // ✅ important

      univExamGroupId: formValues.examGroupId,
      roleId: formValues.roleId,
      examGroupName: selectedGroup?.exam_group_name,
      roleName: selectedRole?.role_name
    };

    // ✅ ADD THIS PAYLOAD (IMPORTANT)
    let payloadObj: any = {
      examScanProfileId: this.data.examScanProfileId,
      univExamGroupId: formValues.examGroupId,
      roleId: formValues.roleId,
      isActive: formValues.isActive ?? true,
      createdUser: +localStorage.getItem('employeeId')
    };

    // ✅ ADD ID ONLY IN EDIT MODE
    if (this.isEditMode) {
      payloadObj.examScanProfileDetailId =
        this.selectedData[this.editIndex]?.examScanProfileDetailId;
    }

    // final payload
    let payload = [payloadObj];

    this.spinner.show();

    // ✅ FIXED API CALL
    this.crudService.add(this.ExamScanProfileDetailsUrl, payload)
      .subscribe(result => {

        this.spinner.hide();

        if (result.statusCode === 200) {
          this.loadEvaluatorDetails();
          this.createUser(this.data.examScanProfileId)
          // ✅ UPDATE TABLE
          if (this.isEditMode) {
            this.selectedData[this.editIndex] = newData;
            this.isEditMode = false;
            this.editIndex = -1;
          } else {
            this.selectedData.push(newData);
          }

          this.dataSource = new MatTableDataSource(this.selectedData);
          this.addevaluatorform.reset();
          this.addevaluatorform.get('isActive').setValue(true);

          this.snotifyService.success('Saved successfully', 'Success!');

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
  // Helper function to get exam name by examId
  getExamNameById(examId: string) {
    const exam = this.examData.find(e => e.fk_exam_id === examId);
    return exam ? exam.exam_name : '';
  }
  // Helper function to get role name by roleId
  getRoleNameById(roleId: number) {
    const role = this.roles.find(r => r.pk_role_id === roleId);
    return role ? role.role_name : '';
  }
  // Helper function to get role name by regulationId
  getregulationById(regulationId) {
    const regulation = this.regulations.find(r => r.fk_regulation_id === regulationId);
    return regulation ? regulation.regulation_code : '';
  }
  // Helper function to get role name by SubjectCode
  getSubjectNameById(subjectId: any) {
    const subject = this.subjectsData.find(s => s.fk_subject_id === subjectId);
    return subject ? subject.subject_code : '';
  }
  // Helper function to get role name by subjectId
  getSubjectById(subjectId: any) {
    const subject = this.subjectsData.find(s => s.fk_subject_id === subjectId);
    return subject ? subject.fk_subject_id : '';
  }
  // Helper function to get role name by collegeCode
  getCollegeById(collegeId) {
    const college = this.colleges.find(c => c.fk_college_id === collegeId);
    return college ? college.college_code : '';
  }
  // Helper function to get role name by groupCode
  getGroupById(courseGroupId) {
    const courseGroup = this.courseGroups.find(c => c.fk_course_group_id === courseGroupId);
    return courseGroup ? courseGroup.group_code : '';
  }
  // Helper function to get role name by courseYear
  getcourseYearById(courseYearId) {
    const courseYear = this.courseYears.find(c => c.fk_course_year_id === courseYearId);
    return courseYear ? courseYear.course_year_code : '';
  }
  // Helper function to get role name by examBatchName
  getBatchByNameById(examLabBatchesId) {
    const batchName = this.examLabBatches.find(c => c.eaxmLabBatchId === examLabBatchesId);
    return batchName ? batchName.batchName : '';
  }
 deleteRow(id: any) {

  const row = this.selectedData.find(
    item => item.examScanProfileDetailId === id
  );

  if (!row) return;

  // ✅ Now clear table
  this.dataSource = new MatTableDataSource([]);
  this.selectedData = [];

  const payload = [{
    examScanProfileId: this.data.examScanProfileId,
    univExamGroupId: row.univExamGroupId,
    roleId: row.roleId,
    isActive: false,
    createdUser: +localStorage.getItem('employeeId'),
    examScanProfileDetailId: row.examScanProfileDetailId
  }];

  this.spinner.show();

  this.crudService.add(this.ExamScanProfileDetailsUrl, payload)
    .subscribe(result => {

      this.spinner.hide();

      if (result.statusCode === 200) {
        this.loadEvaluatorDetails();
        this.createUser(this.data.examScanProfileId);
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
  submit() {
    this.data.examEvaluatorProfileDetailsDTOS = this.examEvaluatorProfileDetailsDTOS;
    this.spinner.show();
    this.crudService.updateMasterDetails(this.updateExamEvaluatorProfiles, this.data)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.snotifyService.success(result.message, 'Success!');
            this.profileDetails(this.data.examScanProfileId);
            this.setupCommittes();
            this.router.navigate(['admin-examination-management/evaluation-process/create-evaluators']);
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
  profileDetails(examEvaluatorProfileId) {
    let request = [
      { paramName: 'in_profile_id', paramValue: examEvaluatorProfileId },
    ];
    this.crudService.getDetailsByRequest(this.popProfileEmployeesUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {

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
  goBack() {
    this.router.navigate(['admin-examination-management/exam-papers-delivery-process/exam-scan-profile']);
  }
  setupCommittes() {
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'exam_committees' },
    ];
    this.crudService.getDetailsByRequest(this.examCommittesUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.success) {
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
createUser(examScanProfileId) {
    let request = [
      { paramName: 'in_scan_profile_id', paramValue: examScanProfileId },
    ];
    this.crudService.getDetailsByRequest(this.getPoPScanProfileEmployeesUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {

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
