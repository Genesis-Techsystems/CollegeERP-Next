import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CONSTANTS } from 'app/main/common/constants';
import { Router, ActivatedRoute } from '@angular/router';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import * as XLSX from 'xlsx';


import * as moment from 'moment';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { GlobalService } from 'app/main/services/global.service';

@Component({
  selector: 'app-internal-marks-entry',
  templateUrl: './internal-marks-entry.component.html',
  styleUrls: ['./internal-marks-entry.component.scss']
})
export class InternalMarksEntryComponent implements OnInit {
  displayedColumns: string[] = ['sno', 'course', 'courseGroup', 'courseyear', 'section','Subject','Subjecttype','enrolled','present','internalmarks'];
  dataSource: MatTableDataSource<any>;
  @ViewChild('scheduledOrdersPaginator') paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('TABLE') excelTable: ElementRef;
  staffForm: FormGroup;
  private getexamresultprocessingUrl = CONSTANTS.ExamPreModerationUrl;
  private collegewisedetailsUrl = CONSTANTS.collegewisedetailsUrl;
  dashboard : any
  filtersDetailsList=[];
  marksListDetails=[];
  marksDetailsList=[];
  CollegesListDetails=[];
  colleges=[];
  examsList=[];
  searchExams=[];
  filteredExams :any ;
  examData=[];
  examsLists=[];
  fromDate: string;
  toDate: string;
  panelOpenState = true;
  step = 0;  
  trafoItem=" Internal Marks Report";
  collegeCode: any;
  exam: any;
  collegeName: string;

  constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, private _globalService: GlobalService,
    private dialog: MatDialog, private genericFunctions: GenericFunctions) {
      this.dashboard = CONSTANTS.dashboard;
}

  ngOnInit(): void {
    this.staffForm = this.formBuilder.group({
      collegeId: ['', Validators.required],
      examId: [0],
    }); 
    this.getFiltersList();
    this.dataSource = new MatTableDataSource<any>(this.marksDetailsList);
    setTimeout(() => this.dataSource.paginator = this.paginator);
    this.dataSource.sort = this.sort;
    this.collegeName = localStorage.getItem('currentCollege')

  }
  getFiltersList(): void {
    this.filtersDetailsList=[]
    this.CollegesListDetails=[]
    this.colleges=[]
    this.spinner.show();
    let request = [
      {paramName: 'in_flag', paramValue: 'clg_exam_timetable_filters'},
      {paramName: 'in_org_id', paramValue:+localStorage.getItem('organizationId')},
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
         {paramName: 'in_employee', paramValue: ''},
         {paramName: 'in_subject', paramValue: ''},
         {paramName: 'in_gm_codes', paramValue:''},
        
         
    ];
    this.crudService.getDetailsByRequest(this.collegewisedetailsUrl, '', request, '&')
  .subscribe(result =>  {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.filtersDetailsList = result.data.result;
              for(let i=0; i<this.filtersDetailsList.length; i++){
                if(this.filtersDetailsList[i].length>0 && this.filtersDetailsList[i][0].flag === 'clg_exam_timetable_filters'){
                  this.CollegesListDetails  = this.filtersDetailsList[i];
                  }
          }
          const CollegeIdData = this.CollegesListDetails.map(({ fk_college_id }) => fk_college_id);
          this.colleges = this.CollegesListDetails.filter(({ fk_college_id }, index) => 
          !CollegeIdData.includes(fk_college_id, index + 1));
          if (this.colleges.length > 0){
            this.colleges = this.colleges.sort((a,b)=>a.clg_sort_order-b.clg_sort_order);
            this.staffForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
            this.collegeCode =this.colleges.filter(x=>x.fk_college_id==this.staffForm.value.collegeId)[0].college_code, 

            this.selectedCollege(this.staffForm.value.collegeId); 
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
  selectedCollege(collegeId): void{
    this.staffForm.get('examId').setValue(0);
    this.examsList = [];
    this.searchExams = [];
    this.examData = []
    this.examsList = []
    this.examsLists=this.CollegesListDetails.filter(x=>(x.fk_college_id == this.staffForm.value.collegeId))
  if(this.examsLists.length>0){
  const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
  this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
  this.examsList  = this.examsList.filter(x=>!x.is_regular_exam)
  this.examData = this.examsList;
  }
  if(this.examsList.length>0){
    this.staffForm.get('examId').setValue(this.examsList[0].fk_exam_id);
  this.selectedExam(this.staffForm.value.examId);
  }

  }
  searchExam(value) {
    this.examData = [];
    this.examSearch(value);
  }
  examSearch(value: string) {
    let filter = value.toLowerCase()
    for (let i = 0; i < this.examsList.length; i++) {
        let option = this.examsList[i];
        if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
            this.examData.push(option);
        }
    }
  }

selectedExam(examId){
  this.exam = this.examsList.filter(x=>(x.fk_exam_id == this.staffForm.value.examId))[0].exam_name;
this.getMarksList();
}
  getMarksList(): void {
    this.marksListDetails=[]
    this.spinner.show();
    let request = [
      {paramName: 'in_flag', paramValue:'internal_exam_marks_entered'},
      {paramName: 'in_exam_id', paramValue: this.staffForm.value.examId},
      {paramName: 'in_college_id', paramValue: this.staffForm.value.collegeId},
      {paramName: 'in_course_id', paramValue: 0},
      {paramName: 'in_course_group_id', paramValue: 0},
      {paramName: 'in_course_year_id', paramValue: 0},
      {paramName: 'in_academic_year_id', paramValue: 0},
      {paramName: 'in_regulation_id', paramValue: 0},
      {paramName: 'in_subject_id', paramValue: 0},
    ];
    this.crudService.getDetailsByRequest(this.getexamresultprocessingUrl, '', request, '&')
  .subscribe(result =>  {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.marksDetailsList = result.data.result[0];
              this.dataSource = new MatTableDataSource<any>(this.marksDetailsList);
              setTimeout(() => this.dataSource.paginator = this.paginator);
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
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
        this.dataSource.paginator.firstPage();
    }
}

  exportAsExcel()
  {
    const ws: XLSX.WorkSheet=XLSX.utils.table_to_sheet(this.excelTable.nativeElement);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    
    /* save to file */
    XLSX.writeFile(wb, 'Internal Marks Entered.xlsx');
    
  }
  printPage(){
    window.print()
  }

}
