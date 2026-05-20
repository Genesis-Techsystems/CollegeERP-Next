import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { Router } from '@angular/router';

@Component({
  selector: 'app-existing-exam-timetable',
  templateUrl: './existing-exam-timetable.component.html',
  styleUrls: ['./existing-exam-timetable.component.scss']
})

export class ExistingExamTimetableComponent implements OnInit {

  constructor(private dialogRef: MatDialogRef<ExistingExamTimetableComponent>, private genericFunctions: GenericFunctions,
              @Inject(MAT_DIALOG_DATA) public data, public router: Router) {
      
   }

  // tslint:disable-next-line: typedef
  ngOnInit() {
  }

}
