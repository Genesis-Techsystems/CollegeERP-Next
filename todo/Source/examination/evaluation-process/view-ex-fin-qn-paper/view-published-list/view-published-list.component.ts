import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-view-published-list',
  templateUrl: './view-published-list.component.html',
  styleUrls: ['./view-published-list.component.scss']
})
export class ViewPublishedListComponent implements OnInit {
  displayedColumns: string[] = ['id', 'college_code', 'group_code', 'course_year_code', 'is_published', 'published_date', 'Employee', 'SecretCode', 'expiryDate', 'Actions'];
  dataSource: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  List = [];
  remunerationForm: FormGroup;
  private ExamQuestionPaperCollegesUrl = CONSTANTS.ExamQuestionPaperCollegesUrl
  Obj: any;
  PublishedList = [];
  RolesList = [];
  EmployeeList = [];
  Levels = [
    { "id": "Level1", "name": "Level 1" },
    { "id": "Level2", "name": "Level 2" },
    { "id": "Level3", "name": "Level 3" }
  ]
  EmployeeList1: any[];
  RolesListDuplicateList=[]
  constructor(private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, private dialogRef: MatDialogRef<ViewPublishedListComponent>,
    @Inject(MAT_DIALOG_DATA) private data, private router: Router, private snotifyService: SnotifyService, private spinner: NgxSpinnerService,
    private crudService: CrudService) {

  }
  ngOnInit(): void {
    this.PublishedList = this.data[0];
    this.RolesList = this.data[1];
    this.RolesListDuplicateList=this.RolesList
    this.EmployeeList = this.data[2];
    this.EmployeeList1 = this.data[2];
    this.remunerationForm = this.formBuilder.group({
      IsRole: [true],
      roleLevel: [],
      role: [],
      CollectorProfile1Id: [],
      SecretCode: [],
      expiryDate: []
    });
    // fk_questionpaper_collectorprofile1_id
    // cp1_secretcode_expirydate
    // collectorprofile1_secretcode
    this.remunerationForm.get('role').setValue(this.RolesList[0].pk_role_id)
    this.remunerationForm.get('roleLevel').setValue(this.Levels[0].id)
    this.remunerationForm.get('roleLevel').disable();
    // for(let i=0;i<this.PublishedList.length;i++){
    //   if(this.PublishedList[i].fk_questionpaper_collectorprofile1_id!=null){
    //     this.remunerationForm.get('CollectorProfile1Id').setValue(this.PublishedList[i].fk_questionpaper_collectorprofile1_id)
    //   }
    //   if(this.PublishedList[i].collectorprofile1_secretcode!=null){
    //     this.remunerationForm.get('SecretCode').setValue(this.PublishedList[i].collectorprofile1_secretcode)

    //   }
    //   else{
    //     // this.selectionRole(this.remunerationForm.value.role)
    //   }
    // }

    this.dataSource = new MatTableDataSource(this.PublishedList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

  }
  selectionRole() {

    this.EmployeeList1 = []
    this.dataSource = new MatTableDataSource([]);
    this.EmployeeList1 = this.EmployeeList.filter(x => (x.fk_emp_role_id == this.remunerationForm.value.role))
    this.remunerationForm.get('CollectorProfile1Id').setValue(this.EmployeeList1[0]?.Pk_emp_id)
    this.dataSource = new MatTableDataSource(this.PublishedList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

  }
  searchRole(event)
    {
      this.RolesListDuplicateList = []
      this.search(event);
    }
    search(value: string) {
      let filter = value.toLowerCase();
      for (let i = 0; i < this.RolesList.length; i++) {
        let option = this.RolesList[i];
        if (option.role_name.toLowerCase().indexOf(filter) >= 0) {
          this.RolesListDuplicateList.push(option);
        }
      }
  }
  saveData(row) {
    const obj = {
      examQuestionPaperId: row.fk_exam_questionpaper_id,
      subjectId: row.fk_subject_id,
      isPublished: row.is_published,
      publishedDate: row.published_date,
      questionPaperPath: row.questionpaper_path,
      isActive: true,
      examTimeTableId: row.fk_exam_timetable_id,
      publishedByEvaluatorProfileId: row.fk_publishedby_evaluatorprofile_id,
      collectorProfile1Comments: row.collectorprofile1_comments,
      collectorProfile2Comments: row.collectorprofile2_comments,
      collectorProfile3Comments: row.collectorprofile3_comments,
      collectorProfile1SecretCode:row.collectorprofile1_secretcode,
      collectorProfile2SecretCode: row.collectorprofile2_secretcode,
      collectorProfile3SecretCode: row.collectorprofile3_secretcode,
      questionpaperCollectorProfile1Id: row.fk_questionpaper_collectorprofile1_id,
      questionPaperCollectorProfile2Id: row.fk_questionpaper_collectorprofile2_id,
      questionPaperCollectorProfile3Id: row.fk_questionpaper_collectorprofile3_id,
      collectorProfile1Accepted: row.is_collectorprofile1_accepted,
      collectorProfile2Accepted: row.is_collectorprofile2_accepted,
      collectorProfile3Accepted: row.is_collectorprofile3_accepted,
      cp1SecretcodeExpiryDate: row.cp1_secretcode_expirydate,
      cp2SecretCodeExpiryDate: row.cp2_secretcode_expirydate,
      cp3SecretCodeExpiryDate: row.cp3_secretcode_expirydate,
      questionPaperDownloaded: null,
      questionPaperDownloadedOn: null,
      downloadedByEvaluatorProfileId: null, 
      // publishedByEmpId: row.fk_publishedby_emp_id,
      publishedByEmpId:this.remunerationForm.value.CollectorProfile1Id,
      downloadedByEmpId: this.remunerationForm.value.CollectorProfile1Id,

    }

    this.crudService.updateDetails(this.ExamQuestionPaperCollegesUrl, obj, row.pk_examquestionpaper_college_id, 'examQuestionPaperCollegeId')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
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

