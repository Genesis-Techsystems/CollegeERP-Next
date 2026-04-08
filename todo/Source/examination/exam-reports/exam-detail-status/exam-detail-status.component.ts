import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router, ActivatedRoute } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import * as _ from 'lodash';
import { ReplaySubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-exam-detail-status',
  templateUrl: './exam-detail-status.component.html',
  styleUrls: ['./exam-detail-status.component.scss']
})
export class ExamDetailStatusComponent implements OnInit {

  displayedColumns: string[] = ['mark','id', 'ProfileName', 'omrSerialNo', 'Status', 'Actions'];

  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatPaginator) paginator1: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatSort) sort1: MatSort;

  @ViewChild('uploadXl') uploadXl: ElementRef;
  tableHeading=''
  private isActive = CONSTANTS.isActive;
  private getcommitteedetailsUrl = CONSTANTS.getcommitteedetailsUrl;
  private studentSearchUrl = CONSTANTS.studentSearchUrl;
 private getExamDetailstatusUrl=CONSTANTS.getExamDetailstatusUrl
 tabledataSource1 = new MatTableDataSource<Element>(ELEMENT_DATA);

  remunerationForm: FormGroup;
  evaluatorSubjectForm: FormGroup;
  step = 0;
  flag: boolean;
  examSubjects: any;
  orgCode: any;
  courseyearcode: any;
  subjectcode: any;
  data: any;
  checksubject: any;
  StatusId: number;
  statusDetails: any;
  approveDetailsList = [];
  monthYearDetailsList = [];
  monthYearDuplicateList = [];
  eaxmDetailsList = [];
  eaxmListDuplicateList = [];
  monthYearSearchList = [];
  eaxmListData = [];
  private _onDestroy = new Subject<void>();
  dashboard;
  examDate = this.genericFunctions.momentWithDateFormatYMD(this.genericFunctions.moment());
  examName='';
  examRole='';
  RemunerationApproveDetailsList=[];
  subjectDuplicateList: any[];
  subjectSearchList: any[];
  subjectDetailList: any[];
  public studentFilterCtrl: FormControl = new FormControl();
  public filteredStudents: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  searchStudents=[];
  displayedColumns1=[];
  examRegisteredStudents=[];
  gridData=[];
  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private dialog: MatDialog, private genericFunctions: GenericFunctions) {
  }
  ngOnInit(): void {
    this.remunerationForm = this.formBuilder.group({
      orgCode: ['', ],
      subjectId: [''],
      examId: ['', Validators.required],
      studentId: [''],

      
    })
    this.dashboard = CONSTANTS.dashboard;
    this.evaluatorSubjectForm = this.formBuilder.group({
      in_orgid: [+localStorage.getItem('organizationId')],
      in_fdate: ['1990-01-01'],
      in_tdate: ['1990-01-01'],
      in_exam_month_yr: [''],
      in_course_code: [''],
      in_course_year_code: [''],
      in_subject_code: [''],
      in_evalutor_profileid: 0,
      in_exam_date: '1990-01-01',
      in_regulation_code: ''
    })
    this.getFiltersList();
    this.dataSource = new MatTableDataSource<any>();
     this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.studentFilterCtrl.valueChanges
    .pipe(takeUntil(this._onDestroy))
    .subscribe(() => {
      this.filterStd();
    });

  this.searchStudents.push({firstName: 'Search by student name or rollNo.'});  

  this.filteredStudents.next(this.searchStudents.slice());
  }
  
  filterStd(): void {
    if (!this.searchStudents) {
      return;
    }
    // get the search keyword
    let search = this.studentFilterCtrl.value;
    if (!search) {
      this.filteredStudents.next(this.searchStudents.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the banks
    this.filteredStudents.next(
     this.searchStudents.filter(x => x.firstName.toLowerCase().indexOf(search) > -1)
    );
  }
  enteredStudent(event): void{
    if (event.target.value.length > 4){
        /*----------- STUDENTS -----------*/
        this.crudService.listByIds(this.studentSearchUrl, event.target.value, 'q')
            .subscribe(result => {
                if (result.statusCode === 200){
                        if (result.success) {  
                            this.searchStudents = result.data;
                            this.filteredStudents.next(this.searchStudents.slice()); 
                        }else{
                            this.snotifyService.info(result.message, 'Info!');
                        }
                    }else{
                        this.snotifyService.error(result.message, 'Error!');
                    } 
                }, error => {
                if (error.error.statusCode === 401){
                    this.snotifyService.error(error.error.message, 'Error!');
                    this.genericFunctions.logOut(this.router.url);
                }else{
                    this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                }
            });
    }
 }
  /* -------- Mat Table Filter  -------*/
  applyFilter(filterValue) {
    this.tabledataSource1.filter = filterValue.trim().toLowerCase();
    if (this.tabledataSource1.paginator) {
      this.tabledataSource1.paginator.firstPage();
    }
  }
  /* -------- Filters  -------*/
  getFiltersList(): void {
    let request = [
      {paramName: 'in_flag', paramValue: 'committee_members'},
      {paramName: 'in_exam_month_yr', paramValue: ''},
      {paramName: 'in_course_code', paramValue: ''},
      {paramName: 'in_course_year_code', paramValue: ''},
      {paramName: 'in_subject_code', paramValue: ''},
      {paramName: 'in_evalutor_profileid', paramValue: 0},
      {paramName: 'in_evaluator_role_id', paramValue: 0},
      {paramName: 'in_exam_date', paramValue: '1990-01-01'},
      {paramName: 'in_regulation_code', paramValue: ''},
      {paramName: 'in_emp_id', paramValue: 0},
      {paramName: 'in_academic_year', paramValue: ''},
	   {paramName: 'in_exam_short_name', paramValue: ''},
	    {paramName: 'in_affiliatedto_catdet_id', paramValue: 0},
		 {paramName: 'in_univ_exam_id', paramValue: 0},
		 {paramName: 'in_univ_committee_id', paramValue: 0},
		 {paramName: 'in_committee_meeting_id', paramValue: 0},
		 {paramName: 'in_loginuser_id', paramValue: 0},
		 
    ];
    this.crudService.getDetailsByRequest(this.getcommitteedetailsUrl, '', request, '&')
  .subscribe(result =>  {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.examSubjects = result.data.result[0];
              // const orgCodeData = this.examSubjects.map(({ org_code }) => org_code);
              // this.orgCode = this.examSubjects.filter(({ org_code }, index) =>
              //   !orgCodeData.includes(org_code, index + 1));
              this.eaxmListDuplicateList = []
              this.eaxmDetailsList = []
              const eaxmDetailsList = this.examSubjects.map(({ exam_name }) => exam_name);
              this.eaxmDetailsList = this.examSubjects.filter(({ exam_name }, index) =>
                !eaxmDetailsList.includes(exam_name, index + 1));
              this.eaxmListData = this.examSubjects.filter(({ exam_name }, index) =>
                !eaxmDetailsList.includes(exam_name, index + 1));
                  /*..............GET COMMITTE DETAILS LIST......... */
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

  selectedOrganization(orgCodeId) {
    this.eaxmListDuplicateList = []
    this.eaxmDetailsList = []
    this.remunerationForm.get('examId').setValue('')
    for (let i = 0; i < this.examSubjects.length; i++) {
      // this.examSubjects[i].exam_month_yr == exam_month_yr &&
      if ( this.examSubjects[i].org_code == this.remunerationForm.value.orgCode) {
        this.eaxmListDuplicateList.push(this.examSubjects[i])
        const eaxmDetailsList = this.eaxmListDuplicateList.map(({ exam_name }) => exam_name);
        this.eaxmDetailsList = this.eaxmListDuplicateList.filter(({ exam_name }, index) =>
          !eaxmDetailsList.includes(exam_name, index + 1));
        this.eaxmListData = this.eaxmListDuplicateList.filter(({ exam_name }, index) =>
          !eaxmDetailsList.includes(exam_name, index + 1));
      }
    }
  }

  /* -------- Search Exam -------*/
  searchExam(value) {
    this.eaxmListData = []
    this.searchExams(value);
  }
  searchExams(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.eaxmDetailsList.length; i++) {
      let option = this.eaxmDetailsList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
        this.eaxmListData.push(option);
      }
      else if (option.from_date.toLowerCase().indexOf(filter) >= 0) {
        this.eaxmListData.push(option);
      }
      else if (option.to_date.toLowerCase().indexOf(filter) >= 0) {
        this.eaxmListData.push(option);
      }
    }
  }
  selectedExam(exam,event) {
    this.examName=event.source.triggerValue
    this.subjectDuplicateList = [];
    this.subjectSearchList =[];
    this.remunerationForm.get('subjectId').setValue('')
    for (let i = 0; i < this.examSubjects.length; i++) {
      if (this.examSubjects[i].fk_university_exam_id == exam 
       ) {
        this.subjectSearchList.push(this.examSubjects[i])
        const subjectDetailList = this.subjectSearchList.map(({ subject_code }) => subject_code);
        this.subjectDetailList = this.subjectSearchList.filter(({ subject_code }, index) =>
          !subjectDetailList.includes(subject_code, index + 1));
         this.subjectDuplicateList = this.subjectSearchList.filter(({ subject_code }, index) =>
          !subjectDetailList.includes(subject_code, index + 1));
          
      }
    }
  }
  
  searchSubjects(value) {
    this.subjectDuplicateList = []
    this.searchSubjectList(value);
  }
  searchSubjectList(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.subjectDetailList.length; i++) {
      let option = this.subjectDetailList[i];
      if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
        this.subjectDuplicateList.push(option);
      }
    }
  }
  selectedName(role,event) {
    this.examRole=event.source.triggerValue
  }
  getExamDetailsStatusList(){
    this.flag=true
    this.examRegisteredStudents=[]
    this.displayedColumns1=[]
    this.tabledataSource1 =new MatTableDataSource<any>([]);
    let request = [
      {paramName: 'in_flag', paramValue: 'list_exam_student_evaluation_status'},
      {paramName: 'in_univ_exam_id', paramValue: this.remunerationForm.value.examId},
      {paramName: 'in_student_id', paramValue: this.remunerationForm.value.studentId?this.remunerationForm.value.studentId:0},
      {paramName: 'in_subject_code', paramValue: this.remunerationForm.value.subjectId?this.remunerationForm.value.subjectId:''},
		 
    ];
    this.crudService.getDetailsByRequest(this.getExamDetailstatusUrl, '', request, '&')
  .subscribe(result =>  {
          this.spinner.hide();
          if (result.statusCode === 200){
            if (result.success) {
                if (result.data.result[0].length > 0){
                     this.examRegisteredStudents = result.data.result[0];
                     this.gridData = this.examRegisteredStudents;
                     this.tabledataSource1 = new MatTableDataSource<any>(this.examRegisteredStudents);
                     this.displayedColumns1 = Object.keys(this.examRegisteredStudents[0]);
                 this.displayedColumns1.splice(0, 4);
                this.displayedColumns1.splice(1, 4);
                //  this.displayedColumns1.splice(5, 1);
                //  this.displayedColumns1.splice(5, 2);
                //  this.displayedColumns1.splice(18, 2);
                     setTimeout(()=>
             this.tabledataSource1.paginator = this.paginator);
            this.tabledataSource1.sort = this.sort;
                  //    for ( let idx = 0; idx < this.gridData.length; idx++) {
                  //      this.gridData[idx].id = idx + 1;
                  //      if (this.gridData[idx].internal_marks === null){
                  //        this.gridData[idx].internal_marks = ' - ';
                  //      }
                  //      if (this.gridData[idx].external_marks === null){
                  //        this.gridData[idx].external_marks = ' - ';
                  //      }
                  //      if (this.gridData[idx].grade === null){
                  //        this.gridData[idx].grade = ' - ';
                  //      }
                  //      if (this.gridData[idx].grade_points === null){
                  //        this.gridData[idx].grade_points = ' - ';
                  //      }
                  //      // tslint:disable-next-line: max-line-length
                  //      this.gridData[idx].college_code = this.gridData[idx].college_code + ' / ' + this.gridData[idx].course_code + ' / ' + this.gridData[idx].regulation_code + ' / ' + this.gridData[idx].group_code + ' / ' + this.gridData[idx].course_year_code ;
                  //  }
                }else{
                  this.snotifyService.success('No Records Found.', 'Success!');
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
}
  const ELEMENT_DATA: Element[] = []




