import { Component, OnInit, ViewChild } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { Regulations } from 'app/main/models/Rregulations';
import { MarksSetup } from 'app/main/models/marksSetup';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ExamGroupModalComponent } from './exam-group-modal/exam-group-modal.component';
import { ParametersService } from 'app/main/services/parameters.service';

@Component({
  selector: 'app-exam-group',
  templateUrl: './exam-group.component.html',
  styleUrls: ['./exam-group.component.scss']
})
export class ExamGroupComponent implements OnInit {

  displayedColumns: string[] = ['id', 'universityCode', 'academicYear', 'examMonthYr', 'examGroupCode', 'examGroupName', 'details', 'isActive', 'actions'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  panelOpenState = true;

  private collegeWiseDetails=CONSTANTS.collegeWiseDetailsUrl;
  private UnivExamGroupUrl = CONSTANTS.UnivExamGroupUrl;
  private univExamGroupIdUrl = CONSTANTS.univExamGroupIdUrl;

  examGroupForm: FormGroup;
  colleges: College[] = [];
  courses: Course[] = [];
  regulations: Regulations[] = [];
  step = 0;
  examGroupList = [];
  examGroups: any = {};
  item: any = {};
  universities = [];
  filtersDetailsList =[]
  filtersdata=[]
  regulationData=[]
  courseData=[];
  regData = [];
  flag = false;

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private parameterService: ParametersService) {
              this.getfilterDetails();
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.examGroupForm = this.formBuilder.group({
        universityId: ['', Validators.required]
      }); 
    this.dataSource = new MatTableDataSource<any>(this.examGroupList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
  getfilterDetails(){
    this.spinner.show()
    let request = [
      {paramName: 'in_flag', paramValue: 'clg_filters'},
      {paramName: 'in_org_id', paramValue: +localStorage.getItem('organizationId')},
      {paramName: 'in_college_id', paramValue: 0},
      {paramName: 'in_course_id', paramValue: 0},
      {paramName: 'in_course_group_id', paramValue: 0},
      {paramName: 'in_course_year_id', paramValue: 0},
      {paramName: 'in_group_section_id', paramValue: 0},
      {paramName: 'in_academic_year_id', paramValue: 0},
      {paramName: 'in_dept_id', paramValue: 0},
      {paramName: 'in_isadmin', paramValue: 0},
      {paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId')},
      {paramName: 'in_loginuser_roleid', paramValue: 0},
      {paramName: 'in_subject', paramValue: ''},
      {paramName: 'in_employee', paramValue: ''},
      {paramName: 'in_gm_codes', paramValue: ''},
    ];
    this.crudService.getDetailsByRequest(this.collegeWiseDetails, '', request, '&')
  .subscribe(result =>  {
      if (result.statusCode === 200) {
        this.spinner.hide()
        if (result.data && result.data !== '' && result.data.result.length > 0) {
           this.filtersDetailsList = result.data.result;
        for(let i=0; i<this.filtersDetailsList.length; i++){
            if(this.filtersDetailsList[i].length>0 && this.filtersDetailsList[i][0].flag === 'clg_filters'){
                this.filtersdata = this.filtersDetailsList[i];
                }
        }
        /*----------- DISTINCT UNIVERSITY-----------*/
        const universityList = this.filtersdata.map(({ fk_university_id }) => fk_university_id);
        this.universities = this.filtersdata.filter(({ fk_university_id }, index) =>
        !universityList.includes(fk_university_id, index + 1));
        if(this.universities && this.universities.length > 0){
            this.examGroupForm.get('universityId').setValue(this.universities[0].fk_university_id);
            this.selectedUniversity(this.examGroupForm.value.universityId);
            this.getDetails();
        }
        } else {
          this.snotifyService.success(result.message, 'Success!');
        }
      } else {
        this.spinner.hide()
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
selectedUniversity(universityId){
  this.flag = false;
  this.examGroupList = [];
  this.dataSource = new MatTableDataSource<any>(this.examGroupList);
}

getDetails(){
  this.flag = true;
  this.examGroupList = [];
  this.dataSource = new MatTableDataSource<any>(this.examGroupList);
  if (this.examGroupForm.valid){
    /*-----------Exams -----------*/      
    this.spinner.show();          
    this.crudService.listDetailsByIdsWithSort(this.UnivExamGroupUrl, this.examGroupForm.value.universityId,
    'university.universityId')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
              if (result.data && result.data !== '') {
                  this.examGroupList = result.data.resultList;
                  this.dataSource = new MatTableDataSource(this.examGroupList);
                  this.dataSource.paginator = this.paginator;
                  this.dataSource.sort = this.sort;
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
}else{
    this.snotifyService.info('Please Select required Filters', 'Info!');
}
}
openDialog(): void {
  this.item = {};
  this.item.universityId = this.examGroupForm.value.universityId;
  this.item.universityCode = this.universities.filter(x => (x.fk_university_id === this.examGroupForm.value.universityId))[0].university_code;
  const dialogRef = this.dialog.open(ExamGroupModalComponent, {
    width: '750px',
    data: this.item
  });

  dialogRef.afterClosed().subscribe(details => {
    if (details != null && details !== ''){  
        this.spinner.show();
        details.universityId = this.examGroupForm.value.universityId;
        /*---------- ADD EXAM GROUP ----------*/
        this.crudService.addDetails(this.UnivExamGroupUrl, details)
        .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200){
                if (result.data && result.data !== '') {
                    this.snotifyService.success(result.message, 'Success!');
                    this.getDetails();
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
});

}

/*---------- EDIT EXAM GROUP -----------*/
editDialog(data): void {
    this.examGroups = data;
    const dialogRef = this.dialog.open(ExamGroupModalComponent, {
    width: '750px',
    data: this.examGroups
    });

    dialogRef.afterClosed().subscribe(details => {
        if (details != null && details !== ''){
            details.univExamGroupId = this.examGroups.univExamGroupId;
            this.updateExamGroup(details);
        }
    });
}

  /*------------ UPDATE EXAM GROUP -----------*/
  updateExamGroup(details): void{
    this.spinner.show();
    this.crudService.updateDetails(this.UnivExamGroupUrl, details, details.univExamGroupId, this.univExamGroupIdUrl)
    .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
            if (result.data && result.data !== '') {
                this.snotifyService.success(result.message, 'Success!');
                this.getDetails();
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


  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
      this.dataSource.filter = filterValue.trim().toLowerCase();

      if (this.dataSource.paginator) {
          this.dataSource.paginator.firstPage();
      }
  }

  groupDetails(row){
    this.router.navigate(['admin-examination-management/exam-papers-delivery-process/exam-group/exam-group-details']);
    this.parameterService.examGroupDetails = row;
  }
}
