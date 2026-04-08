import { Component, OnInit , Inject , ViewChild } from '@angular/core';
import { FormGroup,FormBuilder,FormControl,Validators } from '@angular/forms';
import { CrudService } from 'app/main/services/crud.service';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CampusModalComponent } from 'app/main/apps/admin/campus/campus-modal/campus-modal.component';
import { SnotifyService } from 'ng-snotify';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-check-conflicts-modals',
  templateUrl: './check-conflicts-modals.component.html',
  styleUrls: ['./check-conflicts-modals.component.scss']
})
export class CheckConflictsModalsComponent implements OnInit {

  private ConflictsUrl = CONSTANTS.getCollegeExamDetails;
  filtersform:FormGroup;
  conflictsdata = [];
  // conflictsdata=[
  //   {id:'1',hallticket_number:'123456',student_name:'Manasa',fk_exam_id:'Exam Name',exam_date:'28-12-23',subject_name:'Maths'},
  //   {id:'1',hallticket_number:'123456',student_name:'Mallikarjun',fk_exam_id:'Exam Name',exam_date:'28-12-23',subject_name:'Maths'},
  // ];
  flag:boolean;
  
  displayedColumns: string[] = ['id','hallticket_number','student_name','fk_exam_id','exam_date','subject_name']
  dataSource: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  constructor(private formbuilder:FormBuilder,private crudService:CrudService,private genericFunctions: GenericFunctions,private dialogRef: MatDialogRef<CheckConflictsModalsComponent>,
    @Inject(MAT_DIALOG_DATA) public data, private snotifyService: SnotifyService,private spinner: NgxSpinnerService, 
    private router:Router
    ) { 
      this.getDetails()
    }

  ngOnInit(): void {
    this.filtersform = this.formbuilder.group({
      in_org_id:['',Validators.required],
      in_college_id:['',Validators.required],
      in_academic_year_id:['',Validators.required],
      in_isadmin:['',Validators.required],
      in_exam_id:['',Validators.required],
      in_timetable_id:['',Validators.required],
      in_exam_date:['',Validators.required],
      in_loginuser_empid:['',Validators.required],
      in_loginuser_roleid:['',Validators.required]
    })
    this.dataSource = new MatTableDataSource(this.conflictsdata);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
getDetails(){
  this.spinner.show();
  let request = [
  {paramName: 'in_flag', paramValue: 'exam_student_timetable_validation'},
  {paramName: 'in_org_id', paramValue:+localStorage.getItem('organizationId')},
  {paramName: 'in_college_id', paramValue: 0},
  {paramName: 'in_academic_year_id', paramValue: this.data.academicYearId},
  {paramName: 'in_isadmin', paramValue: 0},
  {paramName: 'in_exam_id', paramValue: this.data.examId},
  {paramName: 'in_timetable_id', paramValue: 0},
  {paramName: 'in_exam_date', paramValue: '1990-01-01'},
  { paramName: 'in_subject_id', paramValue: 0 },
  {paramName: 'in_loginuser_empid', paramValue:0},
  {paramName: 'in_loginuser_roleid', paramValue: 0},
  ];
      this.crudService.getDetailsByRequest(this.ConflictsUrl, '', request, '&')
    .subscribe(result => {
        if (result.statusCode === 200){
             if (result.success) {
              this.spinner.hide();
       this.conflictsdata = result.data.result[0];
      this.dataSource = new MatTableDataSource(this.conflictsdata);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
          this.snotifyService.success(result.message, 'Success!'); 
             } else {
              this.flag = true;
              this.spinner.hide();
             //    this.snotifyService.success(result.message, 'Success!');  
             }
        }else {
          this.spinner.hide();
         this.snotifyService.error(result.message, 'Error!');
     }
     }, error => {            
         if (error.error.statusCode === 401){
          this.spinner.hide();
             this.snotifyService.error(error.error.message, 'Error!');
             this.genericFunctions.logOut(this.router.url);
        }else{
          this.spinner.hide();
            this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        }
     });
    }
    applyFilter(filterValue){
      this.dataSource.filter = filterValue.trim().toLowerCase();
      if (this.dataSource.paginator) {
          this.dataSource.paginator.firstPage();
      }
    }
}

