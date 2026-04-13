import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';

@Component({
  selector: 'app-existing-exam-timetables',
  templateUrl: './existing-exam-timetables.component.html',
  styleUrls: ['./existing-exam-timetables.component.scss']
})
export class ExistingExamTimetablesComponent implements OnInit {

  constructor(private dialogRef: MatDialogRef<ExistingExamTimetablesComponent>, private genericFunctions: GenericFunctions,
    @Inject(MAT_DIALOG_DATA) public data, public router: Router) {

}

// tslint:disable-next-line: typedef
ngOnInit() {
}
}
