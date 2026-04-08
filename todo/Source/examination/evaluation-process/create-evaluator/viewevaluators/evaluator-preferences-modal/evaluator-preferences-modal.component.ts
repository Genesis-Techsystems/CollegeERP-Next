import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';

@Component({
  selector: 'app-evaluator-preferences-modal',
  templateUrl: './evaluator-preferences-modal.component.html',
  styleUrls: ['./evaluator-preferences-modal.component.scss']
})
export class EvaluatorPreferencesModalComponent implements OnInit {

  addevaluatorform: FormGroup;

  dialogTitle = 'Add Preferences';

  courses = [];
  subjects = [];
  subjectsData = [];
  evaluatorPrefences = [];
  regulations = [];

  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private regulationCrudUrl = CONSTANTS.regulationCrudUrl;
  private subjectCrudUrl = CONSTANTS.subjectCrudUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private ExamEvaluatorPreferencesUrl = CONSTANTS.ExamEvaluatorPreferencesUrl;
  private isActive = CONSTANTS.isActive;

  displayedColumns: string[] = ['course', 'regulation', 'subjects', 'actions'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(private dialogRef: MatDialogRef<EvaluatorPreferencesModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data, private genericFunctions: GenericFunctions, private formBuilder: FormBuilder,
    private snotifyService: SnotifyService, private spinner: NgxSpinnerService,
    private crudService: CrudService, public router: Router) { }

  ngOnInit(): void {
    this.addevaluatorform = this.formBuilder.group({
      courseId: ['', Validators.required],
      regulationId: ['', Validators.required],
      subjectId: ['', Validators.required]
    });
    if (this.data) {
      this.getPreferences();
    }
    this.dataSource = new MatTableDataSource([]);
    this.dataSource.sort = this.sort;
    this.getCourses();
  }
  getCourses() {
    this.courses = [];
    this.subjects = [];
    this.dataSource = new MatTableDataSource(this.subjects);
    /*----------- COURSES -----------*/
    this.crudService.listDetailsByIdsWithSort(this.courseCrudUrl, 'true', this.isActive)
      .subscribe(result => {
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.courses = result.data.resultList;
          } else {
            this.snotifyService.success(result.message, 'Success!');
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
  selectedCourse(courseId) {
    this.regulations = [];
    this.subjects = [];
    this.addevaluatorform.get('regulationId').setValue('');
    this.addevaluatorform.get('subjectId').setValue('');
    this.spinner.show();
    /*----------- Regulations -----------*/
            this.crudService.listDetailsByTwoIds(this.regulationCrudUrl,  courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
          .subscribe(result => {
              if (result.statusCode === 200) {
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.regulations = result.data.resultList;
                  } else {
                      this.snotifyService.success(result.message, 'Success!');
                  }
              }else {
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

    this.crudService.listDetailsByTwoIds(this.subjectCrudUrl, courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.subjects = result.data.resultList;
            this.subjects = this.subjects.sort((a, b) => b.subjectId - a.subjectId);
            this.subjectsData = this.subjects;
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
  getPreferences() {
    this.evaluatorPrefences = [];
    this.dataSource = new MatTableDataSource([]);
    this.spinner.show();
    // this.crudService.listAllDetails(this.ExamEvaluatorPreferencesUrl)
    this.crudService.listDetailsByTwoIds(this.ExamEvaluatorPreferencesUrl, this.data.examEvaluatorProfileId, 'true', 'examEvaluatorProfiles.examEvaluatorProfileId',
      this.isActive)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.evaluatorPrefences = result.data.resultList;
            this.updateTable();
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
  searchdata(value) {
    this.subjectsData = []
    this.search(value);
  }
  search(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.subjects.length; i++) {
      let option = this.subjects[i];
      if (option.subjectName.toLowerCase().indexOf(filter) >= 0) {
        this.subjectsData.push(option);
      }
      else if (option.subjectCode.toLowerCase().indexOf(filter) >= 0) {
        this.subjectsData.push(option);
      }
    }
  }
  addPreference() {
    const courseId = this.addevaluatorform.value.courseId;
    const regulationId = this.addevaluatorform.value.regulationId;
    const subjectIds = this.addevaluatorform.value.subjectId;

    if (!courseId || !regulationId || subjectIds.length === 0) return;

    const courseObj = this.courses.find(c => c.courseId === courseId);
    const regulationObj = this.regulations.find(r => r.regulationId === regulationId);
    let duplicateFound = false;

    subjectIds.forEach(subjectId => {
      const subjectObj = this.subjectsData.find(s => s.subjectId === subjectId);

      const existing = this.evaluatorPrefences.find(p => p.courseId === courseId && p.regulationId === regulationId && p.subjectId === subjectId);

      if (!existing) {
        const preference = {
          examEvaluatorProfileId: this.data.examEvaluatorProfileId,
          courseId: courseId,
          courseCode: courseObj?.courseCode,
          regulationId: regulationId,
          regulationCode: regulationObj?.regulationCode,
          subjectId: subjectId,
          subjectCode: subjectObj?.subjectCode,
          isActive: true
        };
        this.evaluatorPrefences.push(preference);
      } else if (!existing.isActive) {
        existing.isActive = true; // Reactivate if soft-deleted
      } else {
        duplicateFound = true; // Already active
      }
    });
    if (duplicateFound) {
      this.snotifyService.info('One or more selected subjects already exist for the selected course.', 'Info!');
    }

    this.updateTable();
    this.addevaluatorform.get('subjectId')?.reset();
  }

  deleteRow(row) {
    const pref = this.evaluatorPrefences.find(p => p.courseId === row.courseId && p.regulationId === row.regulationId && p.subjectId === row.subjectId);
    if (pref) {
      pref.isActive = false;
      this.updateTable();
    }
  }
  updateTable() {
    // Only show isActive items in the visible table
    this.dataSource.data = this.evaluatorPrefences.filter(item => item.isActive);
  }
  submit() {
    this.dialogRef.close(this.evaluatorPrefences);
  }
}