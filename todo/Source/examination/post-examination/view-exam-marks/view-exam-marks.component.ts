import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-view-exam-marks',
  templateUrl: './view-exam-marks.component.html',
  styleUrls: ['./view-exam-marks.component.scss']
})
export class ViewExamMarksComponent implements OnInit {
  dataSource: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('uploadXl') uploadXl: ElementRef;
  private sortOrder = CONSTANTS.sortOrder;
  public formData;
  public getExamDetailsUrl = CONSTANTS.getExamDetailsUrl
  private getcommitteedetailsUrl = CONSTANTS.getcommitteedetailsUrl;


  examFeeCollectionForm: FormGroup;
 
  examListDetails: any;
  tabledataSource: MatTableDataSource<any>;
  filtersDetailsList: any;
  committeDetailsList: any;
  committesDuplicateList: any;
  subjectDuplicateList: any[];
  subjectDetailList: any;
  subjectSearchList: any;
  examName: any;
  examDuplicateList: any;
  examDetailsList: any;
  examSearchList: any;
  step = 0;
  flag=false
  displayedColumns: any[];
  academicYear: any;
  course: any;
  subjectName: any;
  public searchText: string;



  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute) {        
  }

  ngOnInit(): void {
    this.examFeeCollectionForm = this.formBuilder.group({
      universityExamId: ['', Validators.required],
      subjectId: [],
    });
    this.getFiltersList();
  }
/*..............GET FILTERS........... */
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
.subscribe(result => {
   this.spinner.hide();
   if (result.statusCode === 200) {
     if (result.data && result.data !== '' && result.data.result.length > 0) {
       this.filtersDetailsList = result.data.result[0];
       this.academicYear=this.filtersDetailsList[0].academic_year
       this.course=this.filtersDetailsList[0].course_code
                  /*..............GET COMMITTES FROM FILTERS........... */
                  const examDetailsList = this.filtersDetailsList.map(({ exam_name }) => exam_name);
                  this.examDetailsList = this.filtersDetailsList.filter(({ exam_name }, index) =>
                    !examDetailsList.includes(exam_name, index + 1));
                   this.examDuplicateList = this.filtersDetailsList.filter(({ exam_name }, index) =>
                    !examDetailsList.includes(exam_name, index + 1));
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
searchExamDetailsList(value) {
  this.examDuplicateList = [];
  this.examSearch(value);
  }
  examSearch(value: string) {
  let filter = value.toLowerCase()
  for (let i = 0; i < this.examDetailsList.length; i++) {
  let option = this.examDetailsList[i];
  if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
   this.examDuplicateList.push(option);
  }
  }
  }

/*..............GET SUBJECT DETAILS LIST FROM FILTER......... */
getSubjectDetailList(fk_university_exam_id,event){
this.examName= event.source.triggerValue
this.subjectDuplicateList = [];
this.subjectSearchList =[];
this.flag=false
this.examFeeCollectionForm.get('subjectId').setValue('')
for (let i = 0; i < this.filtersDetailsList.length; i++) {
 if (this.filtersDetailsList[i].fk_university_exam_id == fk_university_exam_id) {
   this.subjectSearchList.push(this.filtersDetailsList[i])
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
getSubjectName(event){
this.subjectName= event.source.triggerValue
this.flag=false

}
getDetails(){
  this.flag = true
  this.examListDetails=[]
  this.displayedColumns=[]
  this.tabledataSource = new MatTableDataSource<any>([]);

  let request = [
    {paramName: 'in_flag', paramValue: 'list_exam_student_evaluation_marks'},
    {paramName: 'in_subject_code', paramValue: this.examFeeCollectionForm.value.subjectId},
    {paramName: 'in_univ_exam_id', paramValue:  this.examFeeCollectionForm.value.universityExamId},
    {paramName: 'in_student_id', paramValue: 0},
  ];
  this.crudService.getDetailsByRequest(this.getExamDetailsUrl, '', request, '&')
.subscribe(result =>  {
  this.spinner.hide();
  if (result.statusCode === 200) {
    if (result.data && result.data !== '' && result.data.result.length > 0) {
      this.examListDetails = result.data.result[0]
      this.tabledataSource = new MatTableDataSource<any>(this.examListDetails);
                  this.displayedColumns = Object.keys(this.examListDetails[0]);
                  this.displayedColumns.splice(0,2);
                  this.displayedColumns.splice(2,3);
                  this.displayedColumns.splice(5,1);
                  this.displayedColumns.splice(7,2);
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

applyFilter(event: string) {
  this.tabledataSource.filter = event.trim().toLowerCase();
  if (this.tabledataSource.paginator) {
    this.tabledataSource.paginator.firstPage();
  }
}
}