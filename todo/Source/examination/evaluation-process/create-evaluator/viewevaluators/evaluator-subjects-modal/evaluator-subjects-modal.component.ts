import { Component, OnInit, Inject, ViewChild, ChangeDetectorRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {  Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';

@Component({
  selector: 'app-evaluator-subjects-modal',
  templateUrl: './evaluator-subjects-modal.component.html',
  styleUrls: ['./evaluator-subjects-modal.component.scss']
})
export class EvaluatorSubjectsModalComponent implements OnInit {


  addevaluatorform:FormGroup;

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
  examEvaluatorProfileDetailsDTOS = [];
  dialogTitle = 'Add Details';

  private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
  private getExamEvaluationCodesUrl = CONSTANTS.getExamEvaluationCodesUrl;
  private getViewDataUrl = CONSTANTS.getViewDataUrl;

  displayedColumns: string[] = ['exam', 'role', 'regulation', 'subjects','actions'];
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
  
  constructor(private dialogRef: MatDialogRef<EvaluatorSubjectsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data,private genericFunctions: GenericFunctions, private formBuilder: FormBuilder,
    private snotifyService: SnotifyService, private spinner: NgxSpinnerService,private cd: ChangeDetectorRef,
    private crudService: CrudService, public router: Router) { }

  ngOnInit(): void {
    // this.getData();
    this.getExamFiltersList();
    this.getExamRoles();
    this.addevaluatorform = this.formBuilder.group({
        courseId:['',Validators.required],
        academicYearId:['',Validators.required],
        examId:['',Validators.required],
        regulationId:['',Validators.required],
        roleId:['',Validators.required],
        subjectId:['',Validators.required],
        reason:['']
    });
    this.dataSource = new MatTableDataSource([]);
    this.dataSource.sort = this.sort;
    if (!this.isEmptyObject(this.data)) {
      if(this.data.examEvaluatorProfileDetailsDTOS && 
        this.data.examEvaluatorProfileDetailsDTOS.length > 0){
          this.dialogTitle = 'Edit Details'
          this.examEvaluatorProfileDetailsDTOS = this.data.examEvaluatorProfileDetailsDTOS;
          this.selectedData = this.data.examEvaluatorProfileDetailsDTOS;
          this.dataSource = new MatTableDataSource(this.selectedData);
          this.dataSource.sort = this.sort;
      }
    }
  }
  getExamRoles(){
    this.roles = [];
        let request = [
          { paramName: 'in_viewname', paramValue: 'v_get_exam_eval_roles' },
          { paramName: 'in_select', paramValue: '' },
          { paramName: 'in_whereclause', paramValue: '' },
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

  getExamFiltersList(): void {
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
                  this.examListDetails = list;
                  break;
                }
              }
              if (this.examListDetails && this.examListDetails.length > 0) {
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
    selectedCourse(courseId) {
      this.addevaluatorform.get('academicYearId').setValue('');
      this.addevaluatorform.get('examId').setValue('');
      this.addevaluatorform.get('regulationId').setValue('');
      this.addevaluatorform.get('subjectId').setValue('');
      this.examFilter = [];
      this.exams = [];
      this.academicYears = [];
      this.academicYearsList = [];
      this.regulationDetails = [];
      this.regulationList = [];
      this.regulations = [];
      this.addevaluatorform.get('subjectId').setValue('');
      this.subjectListDetails = [];
      this.subjectsList = [];
      this.subjects = [];
      this.subjectsData = [];
      /*----------- ACADEMIC YEARS -----------*/
      if (courseId != null && courseId !== undefined) {
        this.academicYearsList = this.examListDetails.filter(x => (x.fk_course_id === this.addevaluatorform.value.courseId))
        if (this.academicYearsList.length > 0) {
          const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
          this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
        }
        if (this.academicYears.length > 0) {
          this.academicYears = this.academicYears.sort((a,b)=>parseInt(b.academic_year)-parseInt(a.academic_year)) 
        }
      }
    }
    selectedAcademicYear(academicYearId): void {
      this.addevaluatorform.get('regulationId').setValue('');
      this.addevaluatorform.get('examId').setValue('');
      this.addevaluatorform.get('subjectId').setValue('');
      this.subjectListDetails = [];
      this.subjectsList = [];
      this.subjects = [];
      this.subjectsData = [];
      this.examFilter = [];
      this.exams = [];
      this.regulationDetails = [];
      this.regulationList = [];
      this.regulations = [];
      if (academicYearId !== null && academicYearId !== undefined) {
        /*----------- Exams List -----------*/
      this.examFilter = this.examListDetails.filter(x => (x.fk_course_id === this.addevaluatorform.value.courseId && x.fk_academic_year_id === this.addevaluatorform.value.academicYearId))
        // tslint:disable-next-line:max-line-length
        if(this.examFilter && this.examFilter.length > 0){
          const examsLists = this.examFilter.map(({ fk_exam_id }) => fk_exam_id);
          this.exams = this.examFilter.filter(({ fk_exam_id }, index) => 
          !examsLists.includes(fk_exam_id, index + 1));
          this.examData = this.exams;
        }
      }
    }
    searchexam(value){
      this.examData = [];
      this.filterExams(value)
    }
    filterExams(value: string) { 
      let filter = value.toLowerCase();
      for ( let i = 0 ; i < this.examsList.length; i++ ) {
          let option = this.examsList[i];
          if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
              this.examData.push(option);
          }
      }
    }
selectedExam(examId): void{
  this.addevaluatorform.get('regulationId');
  this.addevaluatorform.get('subjectId').setValue('');
  this.subjectListDetails = [];
  this.subjectsList = [];
  this.subjects = [];
  this.subjectsData = [];
  this.regulationDetails = [];
  this.regulationList = [];
  this.regulations = [];
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_regexamstd' },
        { paramName: 'in_flag_type', paramValue: 'REGSUP' },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_univ_examcenter_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: 0 },
        { paramName: 'in_course_id', paramValue: this.addevaluatorform.value.courseId },
        { paramName: 'in_course_group_id', paramValue: 0 },
        { paramName: 'in_course_year_id', paramValue: 0 },
        { paramName: 'in_exam_id', paramValue: this.addevaluatorform.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.addevaluatorform.value.academicYearId },
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
              this.regulationDetails = result.data.result;
              for (const list of this.regulationDetails) {
                if (list?.length > 0 && list[0].flag === 'univ_exam_rest_filters') {
                  this.regulationList = list;
                  break;  // Stop looping once we find the first match
                }
              }
              const regulationIdData = this.regulationList.map(({ fk_regulation_id }) => fk_regulation_id);
              this.regulations = this.regulationList.filter(({ fk_regulation_id }, index) =>
                !regulationIdData.includes(fk_regulation_id, index + 1));
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
selectedRegulation(regulationId){
    this.addevaluatorform.get('subjectId').setValue('');
    this.subjectListDetails = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
   if (this.addevaluatorform.value.regulationId != null && regulationId != null) {
    /*----------- SUBJECTS -----------*/
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_subject_regexamstd' },
      { paramName: 'in_flag_type', paramValue: 'REGSUP' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_univ_examcenter_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: this.addevaluatorform.value.courseId },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: this.addevaluatorform.value.examId },
      { paramName: 'in_academic_year_id', paramValue: this.addevaluatorform.value.academicYearId },
      { paramName: 'in_regulation_id', paramValue: this.addevaluatorform.value.regulationId },
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
                this.subjectsList = list;
                break;
              }
            }
            if(this.subjectsList && this.subjectsList.length > 0){
              const courseCodeData = this.subjectsList.map(({ fk_subject_id }) => fk_subject_id);
              this.subjects = this.subjectsList.filter(({ fk_subject_id }, index) =>
              !courseCodeData.includes(fk_subject_id, index + 1));
              this.subjectsData = this.subjects;
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










  getData(){
    let request = [
      {paramName: 'in_flag', paramValue: 'list_exam_subjects'},
      {paramName: 'in_orgid', paramValue:+localStorage.getItem('organizationId')},
      {paramName: 'in_fdate', paramValue: '1990-01-01'},
      {paramName: 'in_tdate', paramValue: '1990-01-01'},
      {paramName: 'in_evalutor_profileid', paramValue: 0},
      {paramName: 'in_exam_date', paramValue: '1990-01-01'},
      {paramName: 'in_emp_id', paramValue: 0},
      {paramName: 'in_questionpaper_id', paramValue: 0},
      {paramName: 'in_evaluator_role_id', paramValue: 0},
      {paramName: 'in_academic_year', paramValue: ''},
      {paramName: 'in_exam_short_name', paramValue: ''},
      {paramName: 'in_affiliatedto_catdet_id', paramValue: 0},
      {paramName: 'in_exam_id', paramValue: 0},
      {paramName: 'in_course_year_id', paramValue: 0},
      {paramName: 'in_subject_id', paramValue:0},
      {paramName: 'in_regulation_id', paramValue:0},
      {paramName: 'in_course_id', paramValue:0},
      {paramName: 'in_academic_year_id', paramValue:0},
      {paramName: 'in_loginuser_empid', paramValue:+localStorage.getItem('employeeId')} 
    ];
    this.crudService.getDetailsByRequest(this.getExamEvaluationCodesUrl, '', request, '&')
    .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200){
           if (result.data && result.data !== '' && result.data.result.length > 0) {
                this.filtersData = result.data.result[0];
                if(this.filtersData && this.filtersData.length > 0){
                  this.examFilter = this.filtersData.filter(x=>(x.fk_university_id === 1));
                  if(this.examFilter && this.examFilter.length > 0){
                    const examsLists = this.examFilter.map(({ fk_exam_id }) => fk_exam_id);
                    this.exams = this.examFilter.filter(({ fk_exam_id }, index) => 
                    !examsLists.includes(fk_exam_id, index + 1));
                    this.examData = this.exams;
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
  searchdata(value) { 
    this.subjectsData=[]
   this.search(value);
    }
  search(value: string) { 
    let filter = value.toLowerCase();
    for ( let i = 0 ; i < this.subjects.length; i++ ) {
        let option = this.subjects[i];
        if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
            this.subjectsData.push(option);
        }
        else if(option.subject_code.toLowerCase().indexOf(filter) >= 0){
          this.subjectsData.push(option);
        }
    }
  }
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  addToTable() {
    const formValues = this.addevaluatorform.value;
    if (this.addevaluatorform.valid) {
      if (this.dialogTitle === 'Add Details') {
        formValues.subjectId.forEach((subjectId: any) => {
          const profileDetail = {
            examId: formValues.examId,
            evaluatorRoleId: formValues.roleId,
            regulationId: formValues.regulationId,
            subjectId: +subjectId,
            isActive: true,
            reason: formValues.reason,
            createdUser: +localStorage.getItem('employeeId')
          };
          this.examEvaluatorProfileDetailsDTOS.push(profileDetail);
          this.selectedData.push({
            examId: formValues.examId,
            regulationId: formValues.regulationId,
            evaluatorRoleId: formValues.roleId,
            subjectId: +this.getSubjectById(subjectId),
            examName: this.getExamNameById(formValues.examId),
            regulationCode: this.getregulationById(formValues.regulationId),
            roleName: this.getRoleNameById(formValues.roleId),
            subjectCode: this.getSubjectNameById(subjectId),
            isActive: true,
            reason: formValues.reason,
            createdUser: +localStorage.getItem('employeeId')
          });
        });        
      } else {
        formValues.subjectId.forEach((subjectId: any) => {
          const editprofileDetail = {
            examEvaluatorProfileId: this.data.examEvaluatorProfileId,
            examId: formValues.examId,
            regulationId: formValues.regulationId,
            examName: this.getExamNameById(formValues.examId),
            regulationCode: this.getregulationById(formValues.regulationId),
            evaluatorRoleId: formValues.roleId,
            subjectCode: this.getSubjectNameById(subjectId),
            subjectId: +subjectId,
            isActive: true,
            reason: formValues.reason,
            updatedUser: +localStorage.getItem('employeeId')
          };
          this.examEvaluatorProfileDetailsDTOS.push(editprofileDetail);
        });
      }
      this.dataSource = new MatTableDataSource(this.selectedData);
      this.dataSource.sort = this.sort;
      this.addevaluatorform.reset();
    } else {
      this.snotifyService.info('Please select exam, role, regulation, and at least one subject.', 'Info!');
    }
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
  getregulationById(regulationId){
    const regulation = this.regulations.find(r => r.fk_regulation_id === regulationId);
    return regulation ? regulation.regulation_code : '';
  }
  // Helper function to get role name by SubjectCode
  getSubjectNameById(subjectId: any) {
    const subject = this.subjectsData.find(s => s.fk_subject_id === subjectId);
    return subject ? subject.subject_code : '';
  }
  // Helper function to get role name by subjectId
  getSubjectById(subjectId: any){
    const subject = this.subjectsData.find(s => s.fk_subject_id === subjectId);
    return subject ? subject.fk_subject_id : '';
  }
  deleteRow(subjectId: any) {
    const id = +subjectId;
    if (this.dialogTitle === 'Add Details') {
      const index = this.selectedData.findIndex((item) => item.subjectId === id);
      if (index > -1) {
        this.examEvaluatorProfileDetailsDTOS.splice(index, 1);
        this.selectedData.splice(index, 1);
        this.dataSource = new MatTableDataSource(this.selectedData);
        this.dataSource.sort = this.sort;
      }
    } else {
      const index = this.selectedData.findIndex((item) => item.subjectId === id);
      const index2 = this.examEvaluatorProfileDetailsDTOS.findIndex((item) => item.subjectId === id);
  
      if (index2 > -1) {
        this.examEvaluatorProfileDetailsDTOS[index2].isActive = false;
        this.examEvaluatorProfileDetailsDTOS = [...this.examEvaluatorProfileDetailsDTOS];
        this.cd.detectChanges();
      }
      if (index > -1) {
        this.selectedData.splice(index, 1);
        this.dataSource = new MatTableDataSource(this.selectedData);
        this.dataSource.sort = this.sort;
      }
    }
  }
  submit(){
     this.data.examEvaluatorProfileDetailsDTOS = this.examEvaluatorProfileDetailsDTOS;
     console.log(this.data,'this.data');
     this.dialogRef.close(this.data);
  }
}